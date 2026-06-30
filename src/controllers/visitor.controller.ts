// /src/controllers/visitor.controller.ts

import type { Request, Response, NextFunction } from 'express'
import Visitor from '../models/Visitor.js'
import ChatSession from '../models/ChatSession.js'
import { EventService } from '../services/event.service.js'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'

export const updateVisitorProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { visitorTrackingId, propertyId, name, email } = req.body

    if (!visitorTrackingId || !propertyId) {
      return next(new AppError('Missing tracking parameters', 400))
    }

    const visitor = await Visitor.findOneAndUpdate(
      { visitorTrackingId, propertyId },
      { name: name.trim(), email: email.trim().toLowerCase() },
      { new: true },
    )

    if (!visitor) {
      return next(new AppError('Visitor profile map not found', 404))
    }

    const activeSession = await ChatSession.findOne({
      visitorId: visitor._id,
      status: { $in: ['active', 'queued', 'waiting'] },
    })

    if (activeSession) {
      EventService.emitToProperty(propertyId, 'dashboard_visitor_updated', {
        sessionId: activeSession._id,
        visitorId: visitor._id,
        name: visitor.name,
        email: visitor.email,
      })
    }

    res.status(200).json({
      status: 'success',
      data: visitor,
    })
  },
)