// /src/controllers/widget.controller.ts

import type { NextFunction, Request, Response } from 'express'

import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'

import {
  initializeWidgetSession,
  verifyWidgetAccess,
  buildWidgetResponse,
} from '../services/widget.service.js'

/* -------------------------------------------------------------------------- */
/* Initialize Widget                                                          */
/* -------------------------------------------------------------------------- */

export const initializeWidget = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { widgetId, visitorTrackingId } = req.body

    if (!widgetId) {
      return next(new AppError('Widget configuration ID is required.', 400))
    }

    const origin =
      (req.headers.origin as string) || (req.headers.referer as string)

    const { property, onlineOperators, visitor } =
      await initializeWidgetSession(widgetId, visitorTrackingId, origin)

    res
      .status(200)
      .json(buildWidgetResponse(property, onlineOperators, visitor))
  },
)

/* -------------------------------------------------------------------------- */
/* Verify Widget                                                              */
/* -------------------------------------------------------------------------- */

export const verifyWidget = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { widgetId } = req.body

    if (!widgetId) {
      return next(new AppError('Widget ID is required.', 400))
    }

    const origin =
      (req.headers.origin as string) || (req.headers.referer as string)

    const { property } = await verifyWidgetAccess(widgetId, origin)

    res.status(200).json({
      status: 'success',

      message: 'Widget verification successful.',

      data: {
        verified: true,

        widget: {
          id: property.widgetId,
          version: '1.0.0',
        },

        property: {
          id: property._id,
          name: property.name,
        },

        apiVersion: 'v1',
      },
    })
  },
)
