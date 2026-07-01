// /src/controllers/visitor.controller.ts

import type { Request, Response, NextFunction } from 'express'
import Visitor from '../models/Visitor.js'
import Operator from '../models/Operator.js'
import Property from '../models/Property.js'
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

    // 1. Fetch the property setup to accurately identify the tenant workspace (accountId)
    const property = await Property.findById(propertyId)
    if (!property) {
      return next(new AppError('Target property channel not found', 404))
    }

    // 2. Fetch current visitor to verify their existence
    const currentVisitor = await Visitor.findOne({
      visitorTrackingId,
      propertyId,
    })
    if (!currentVisitor) {
      return next(new AppError('Visitor profile map not found', 404))
    }

    /* -------------------------------------------------------------------------- */
    /* ENFORCE EMAIL UNIQUE RULES (ACROSS OTHER VISITORS & TENANT OPERATORS)      */
    /* -------------------------------------------------------------------------- */

    // Check A: Is this email claimed by an agent/admin inside this workspace tenant ecosystem?
    const operatorConflict = await Operator.findOne({
      accountId: property.accountId, // 🎯 Solved: Safely checking through the property metadata wrapper
      email: cleanEmail,
    })

    if (operatorConflict) {
      return next(
        new AppError(
          'This email is registered to a support agent and cannot be used as a visitor identity.',
          400,
        ),
      )
    }

    // Check B: Is this email claimed by another distinct visitor profile under this chat widget?
    const visitorConflict = await Visitor.findOne({
      propertyId,
      email: cleanEmail,
      visitorTrackingId: { $ne: visitorTrackingId },
    })

    if (visitorConflict) {
      return next(
        new AppError(
          'This email address is already in use by another session.',
          400,
        ),
      )
    }

    /* -------------------------------------------------------------------------- */
    /* SAFE RE-ASSIGNMENT WRITE                                                   */
    /* -------------------------------------------------------------------------- */
    currentVisitor.name = name.trim()
    currentVisitor.email = cleanEmail
    await currentVisitor.save()

    /* -------------------------------------------------------------------------- */
    /* EMIT CHANGES TO LIVE DASHBOARDS                                            */
    /* -------------------------------------------------------------------------- */
    const activeSession = await ChatSession.findOne({
      visitorId: currentVisitor._id,
      status: { $in: ['active', 'queued', 'waiting'] },
    })

    if (activeSession) {
      EventService.emitToProperty(propertyId, 'dashboard_visitor_updated', {
        sessionId: activeSession._id,
        visitorId: currentVisitor._id,
        name: currentVisitor.name,
        email: currentVisitor.email,
      })
    }

    res.status(200).json({
      success: true,
      message: 'Visitor profile updated successfully',
      data: currentVisitor,
    })
  },
)