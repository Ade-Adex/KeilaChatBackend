// /src/controllers/widget.controller.ts

import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import Property from '../models/Property.js'
import Operator from '../models/Operator.js'
import Visitor from '../models/Visitor.js'
// import redisClient from '../config/redis.js'

export const initializeWidget = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { widgetId, visitorTrackingId } = req.body

    // 1. Structural Sanity Check
    if (!widgetId) {
      return next(new AppError('Widget Configuration ID is required.', 400))
    }

    // 2. Fetch Property and configuration state
    const property = await Property.findOne({ widgetId })
    if (!property) {
      return next(
        new AppError('Unauthorized or invalid widget configuration.', 404),
      )
    }

    // // 3. Assess System Availability via Redis Cache State
    // const operatorStatusPattern = `operator:status:${property.accountId}:*`
    // const activeOperatorKeys = await redisClient.keys(operatorStatusPattern)

    // // Fallback check to MongoDB if cache layer is clean, adjusting live indicators dynamically
    // let isSystemOnline = activeOperatorKeys.length > 0
    // if (!isSystemOnline && property.settings.onlineStatus) {
    //   const liveOperatorCount = await Operator.countDocuments({
    //     accountId: property.accountId,
    //     isOnline: true,
    //   })
    //   isSystemOnline = liveOperatorCount > 0
    // }

    let isSystemOnline = false
    if (property.settings.onlineStatus) {
      const liveOperatorCount = await Operator.countDocuments({
        accountId: property.accountId,
        isOnline: true,
      })
      isSystemOnline = liveOperatorCount > 0
    }

    // 4. Trace or Provision Visitor Information Records
   let visitorData = null
   if (visitorTrackingId) {
     visitorData = await Visitor.findOne({
       propertyId: property._id,
       visitorTrackingId,
     })

     if (visitorData) {
       visitorData.lastSeen = new Date()
       await visitorData.save()
     } else {
       visitorData = await Visitor.create({
         propertyId: property._id,
         visitorTrackingId,
         name: 'Anonymous Visitor',
       })
     }
   }

    // 5. Build Industrial Standard Payload Envelope
    res.status(200).json({
      status: 'success',
      data: {
        property: {
          id: property._id,
          name: property.name,
          domain: property.domain,
          settings: {
            themeColor: property.settings.themeColor,
            headingText: property.settings.headingText,
            isOnline: isSystemOnline,
          },
        },
        visitor: visitorData
          ? {
              id: visitorData._id,
              trackingId: visitorData.visitorTrackingId,
              name: visitorData.name,
              email: visitorData.email,
            }
          : null,
      },
    })
  },
)
