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

// export const initializeWidget = catchAsync(
//   async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     const { widgetId, visitorTrackingId } = req.body

//     if (!widgetId) {
//       return next(new AppError('Widget configuration ID is required.', 400))
//     }

//     const origin =
//       (req.headers.origin as string) || (req.headers.referer as string)

//     const { property, onlineOperators, visitor } =
//       await initializeWidgetSession(widgetId, visitorTrackingId, origin)

//     res
//       .status(200)
//       .json(buildWidgetResponse(property, onlineOperators, visitor))
//   },
// )



export const initializeWidget = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Collect the explicit metadata block passed down from the embed script
    const { widgetId, visitorTrackingId, metadata } = req.body

    if (!widgetId) {
      return next(new AppError('Widget configuration ID is required.', 400))
    }

    const origin = (req.headers.origin as string) || (req.headers.referer as string)
    const clientIp = req.ip || req.headers['x-forwarded-for'] as string;

    // Forward telemetry datasets into our updated service parameters
    const { property, onlineOperators, visitor } =
      await initializeWidgetSession(widgetId, visitorTrackingId, origin, metadata, clientIp)

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
    const widgetId = String(req.params.widgetId)

    if (!widgetId) {
      return next(new AppError('Widget ID is required.', 400))
    }

    const origin =
      (req.headers.origin as string) || (req.headers.referer as string)

    const { property } = await verifyWidgetAccess(widgetId, origin)

    res.status(200).json({
      status: 'success',

      data: {
        id: property.widgetId,

        name: property.name,

        theme: {
          primaryColor: property.widgetSettings?.primaryColor ?? '#2563eb',
        },

        // 🎯 FIX: Forward the explicit widgetSettings object structure downstream
        widgetSettings: {
          aiName: property.widgetSettings?.aiName,
          launcherPosition:
            property.widgetSettings?.launcherPosition ?? 'right',
          welcomeMessage:
            property.widgetSettings?.welcomeMessage ??
            'Hi! How can we help you today?',
          offlineMessage:
            property.widgetSettings?.offlineMessage ?? 'Leave us a message.',
          showAgentPhoto: property.widgetSettings?.showAgentPhoto ?? true,
          soundEnabled: property.widgetSettings?.soundEnabled ?? true,
          allowFileUpload: property.widgetSettings?.allowFileUpload ?? true,
          allowEmoji: property.widgetSettings?.allowEmoji ?? true,
          allowScreenshots: property.widgetSettings?.allowScreenshots ?? false,
          allowVoiceRecordings:
            property.widgetSettings?.allowVoiceRecordings ?? true,
        },

        settings: {
          aiEnabled: property.settings?.aiEnabled ?? true, 
          aiName: property.widgetSettings?.aiName ?? property.settings?.aiName,
          welcomeMessage:
            property.widgetSettings?.welcomeMessage ??
            'Hi! How can we help you today?',
          offlineMessage:
            property.widgetSettings?.offlineMessage ?? 'Leave us a message.',
          allowFileUpload: property.widgetSettings?.allowFileUpload ?? true,
          allowEmoji: property.widgetSettings?.allowEmoji ?? true,
          allowScreenshots: property.widgetSettings?.allowScreenshots ?? false,
          allowVoiceRecordings:
            property.widgetSettings?.allowVoiceRecordings ?? true, 
        },

        verified: true,
      },
    })
  },
)
/* -------------------------------------------------------------------------- */
/* Widget Status                                                              */
/* -------------------------------------------------------------------------- */

export const widgetStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const widgetId = String(req.params.widgetId)

    if (!widgetId) {
      return next(new AppError('Widget ID is required.', 400))
    }

    const { property } = await verifyWidgetAccess(widgetId)

    res.status(200).json({
      status: 'success',

      data: {
        online: property.settings.onlineStatus,
        widgetId: property.widgetId,
        propertyName: property.name,
        aiEnabled: property.settings?.aiEnabled ?? true, 
        allowFileUpload: property.widgetSettings?.allowFileUpload,
        allowEmoji: property.widgetSettings?.allowEmoji,
        allowScreenshots: property.widgetSettings?.allowScreenshots,
        allowVoiceRecordings:
          property.widgetSettings?.allowVoiceRecordings ?? true, 
      },
    })
  },
)

/* -------------------------------------------------------------------------- */
/* Widget Settings                                                            */
/* -------------------------------------------------------------------------- */

export const getWidgetSettings = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const widgetId = String(req.params.widgetId)

    if (!widgetId) {
      return next(new AppError('Widget ID is required.', 400))
    }

    const { property } = await verifyWidgetAccess(widgetId)

   res.status(200).json({
     status: 'success',
     data: {
       ...(property.widgetSettings ?? property.settings),
       aiEnabled: property.settings?.aiEnabled ?? true,
     },
   })
  },
)