// /src/controllers/widget.controller.ts

import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import Property from '../models/Property.js'
import Operator from '../models/Operator.js'
import Visitor from '../models/Visitor.js'
import { normalizeDomain } from '../utils/domain.utils.js'

export const initializeWidget = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 1. Extract context from body AND headers
    const { widgetId, visitorTrackingId } = req.body

    const origin = req.headers.origin || req.headers.referer

    // 1. Get the Property
    const property = await Property.findOne({ widgetId }).lean()
    if (!property)
      return next(new AppError('Invalid widget configuration.', 404))

    // 2. Strict Domain Validation
    const requestHostname = normalizeDomain(origin)
    const registeredDomain = normalizeDomain(property.domain)

    if (!requestHostname || requestHostname !== registeredDomain) {
      return next(new AppError('Forbidden: Domain mismatch.', 403))
    }

    if (!widgetId) {
      return next(new AppError('Widget Configuration ID is required.', 400))
    }

    // 4. System Status Check
    const liveOperatorCount = await Operator.countDocuments({
      accountId: property.accountId,
      isOnline: true,
    })

    // 5. Visitor Persistence
    let visitorData = null
    if (visitorTrackingId) {
      visitorData = await Visitor.findOneAndUpdate(
        { propertyId: property._id, visitorTrackingId },
        {
          $set: { lastSeen: new Date() },
          $setOnInsert: { name: 'Anonymous Visitor' },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean()
    }

    // 6. Return Payload
    // By sending all settings in one shot, the frontend can render immediately
    // without needing subsequent "settings" API calls.
    res.status(200).json({
      status: 'success',
      data: {
        property: {
          id: property._id,
          name: property.name,
          settings: {
            ...property.settings,
            isOnline: liveOperatorCount > 0, // Dynamic live status
          },
        },
        visitor: visitorData
          ? {
              id: visitorData._id,
              trackingId: visitorData.visitorTrackingId,
              name: visitorData.name,
            }
          : null,
      },
    })
  },
)
