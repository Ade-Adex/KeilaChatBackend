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

    if (!name || !email) {
      return next(new AppError('Name and email are required', 400))
    }

    const cleanEmail = email.trim().toLowerCase()

    /* -------------------------------------------------------------------------- */
    /* PREVENT EMAIL DUPLICATION                            */
    /* -------------------------------------------------------------------------- */
    // Check if another visitor profile on this specific property is already using this email
    const emailConflict = await Visitor.findOne({
      propertyId,
      email: cleanEmail,
      visitorTrackingId: { $ne: visitorTrackingId }, // Exclude the current visitor making the request
    })

    if (emailConflict) {
      return next(
        new AppError(
          'This email address is already in use by another session.',
          400,
        ),
      )
    }

    /* -------------------------------------------------------------------------- */
    /* UPDATE VISITOR PROFILE                              */
    /* -------------------------------------------------------------------------- */
    const visitor = await Visitor.findOneAndUpdate(
      { visitorTrackingId, propertyId },
      { name: name.trim(), email: cleanEmail },
      { new: true },
    )

    if (!visitor) {
      return next(new AppError('Visitor profile map not found', 404))
    }

    /* -------------------------------------------------------------------------- */
    /* EMIT CHANGES TO DASHBOARD                           */
    /* -------------------------------------------------------------------------- */
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

    // Following your JSend-style uniform payload convention
    res.status(200).json({
      success: true,
      message: 'Visitor profile updated successfully',
      data: visitor,
    })
  },
)