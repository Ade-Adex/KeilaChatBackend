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
    // 1. Guard Clause: Validate inputs first
    const { widgetId, visitorTrackingId } = req.body
    if (!widgetId) {
      return next(new AppError('Widget Configuration ID is required.', 400))
    }

    // 2. Lookup Property
    const property = await Property.findOne({ widgetId }).lean()
    if (!property) {
      console.error(
        `[WidgetInit] 404 Error: Widget ID '${widgetId}' not found in database.`,
      )
      return next(
        new AppError(
          'Invalid widget configuration. Please check your data-id.',
          404,
        ),
      )
    }

    // 3. Domain Validation (with logging)
    const origin = req.headers.origin || req.headers.referer
    const requestHostname = normalizeDomain(origin)
    const registeredDomain = normalizeDomain(property.domain)

    if (!requestHostname) {
      console.error(
        `[WidgetInit] 403 Error: Could not determine origin for widget '${widgetId}'. Referer: ${origin}`,
      )
      return next(
        new AppError('Access denied: Unable to verify origin domain.', 403),
      )
    }

    if (requestHostname !== registeredDomain) {
      console.error(
        `[WidgetInit] 403 Error: Domain mismatch. Request from '${requestHostname}' tried to access property registered to '${registeredDomain}'`,
      )
      return next(
        new AppError(
          'Forbidden: Widget is not authorized for this domain.',
          403,
        ),
      )
    }

    // 4. System Status
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
    res.status(200).json({
      status: 'success',
      data: {
        property: {
          id: property._id,
          name: property.name,
          settings: {
            ...property.settings,
            isOnline: liveOperatorCount > 0,
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

export const verifyWidget = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { widgetId } = req.body
    const referer = req.headers.referer

    if (!widgetId) {
      return next(new AppError('Widget ID is required.', 400))
    }

    const property = await Property.findOne({ widgetId }).lean()

    if (!property) {
      console.error(
        `[WidgetVerify] 404 Error: Widget ID '${widgetId}' not found.`,
      )
      return next(new AppError('Invalid Widget ID.', 404))
    }

    const requestHostname = normalizeDomain(referer)
    const registeredHostname = normalizeDomain(property.domain)

    if (!requestHostname || requestHostname !== registeredHostname) {
      console.error(
        `[WidgetVerify] 403 Error: Domain mismatch. Request: '${requestHostname}', Expected: '${registeredHostname}'`,
      )
      return next(new AppError('Unauthorized Domain', 403))
    }

    res.status(200).json({ status: 'success' })
  },
)