// /src/services/visitor.service.ts

import Visitor from '../models/Visitor.js'
import ChatSession from '../models/ChatSession.js'
import { EventService } from './event.service.js'
import { AppError } from './appError.js'

export class VisitorService {
  /**
   * Updates a visitor's profile variables securely and broadcasts changes
   */
  public static async updateProfile(params: {
    propertyId: string
    visitorTrackingId: string
    name: string
    email: string
  }) {
    const { propertyId, visitorTrackingId, name, email } = params

    const updatedVisitor = await Visitor.findOneAndUpdate(
      { propertyId, visitorTrackingId },
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      },
      { new: true, runValidators: true },
    )

    if (!updatedVisitor) {
      throw new AppError('Profile update failed: Visitor not found.', 404)
    }

    // Locate active live conversation channels associated with this specific user
    const liveSession = await ChatSession.findOne({
      visitorId: updatedVisitor._id,
      status: { $in: ['active', 'queued', 'waiting'] },
    })

    if (liveSession) {
      EventService.emitToProperty(propertyId, 'dashboard_visitor_updated', {
        sessionId: liveSession._id,
        visitorId: updatedVisitor._id,
        name: updatedVisitor.name,
        email: updatedVisitor.email,
      })
    }

    return updatedVisitor
  }
}