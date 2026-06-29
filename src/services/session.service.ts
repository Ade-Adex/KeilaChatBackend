// /src/services/session.service.ts

import ChatSession from '../models/ChatSession.js'
import Property from '../models/Property.js'
import Visitor from '../models/Visitor.js'

import { AppError } from './appError.js'

export async function getSessionById(sessionId: string) {
  const session = await ChatSession.findById(sessionId)
    .populate('assignedOperatorId', 'firstName lastName email avatar')
    .populate('visitorId', 'name email')

  if (!session) {
    throw new AppError('Chat session not found', 404)
  }

  return session
}

export async function getActiveSessions(propertyId: string) {
  return ChatSession.find({
    propertyId,
    status: 'active',
  })
    .sort({
      updatedAt: -1,
    })
    .populate('assignedOperatorId', 'firstName lastName')
    .populate('visitorId', 'name')
}

export async function getQueuedSessions(propertyId: string) {
  return ChatSession.find({
    propertyId,
    status: 'queued',
  })
    .sort({
      createdAt: 1,
    })
    .populate('visitorId', 'name')
}

export async function getOperatorChatHistory(operatorId: string) {
  return ChatSession.find({
    assignedOperatorId: operatorId,
  })
    .sort({
      updatedAt: -1,
    })
    .populate('visitorId', 'name email')
}

export async function getPropertySessions(propertyId: string) {
  return ChatSession.find({
    propertyId,
  })
    .sort({
      createdAt: -1,
    })
    .populate('assignedOperatorId', 'firstName lastName')
    .populate('visitorId', 'name')
}

export async function getOpenSessionCount(propertyId: string) {
  return ChatSession.countDocuments({
    propertyId,
    status: {
      $in: ['queued', 'active'],
    },
  })
}

export async function getClosedSessionCount(propertyId: string) {
  return ChatSession.countDocuments({
    propertyId,
    status: 'closed',
  })
}

export async function initiateVisitorSession({
  widgetId,
  visitorTrackingId,
}: {
  widgetId: string
  visitorTrackingId: string
}) {
  /*
   * Find property by widgetId
   */
  const property = await Property.findOne({
    widgetId,
  })

  if (!property) {
    throw new AppError('Invalid widget', 404)
  }

  /*
   * Find visitor
   */
  const visitor = await Visitor.findOne({
    propertyId: property._id,
    visitorTrackingId,
  })

  if (!visitor) {
    throw new AppError('Visitor not found', 404)
  }

  /*
   * Existing active session
   */
 const session = await ChatSession.findOneAndUpdate(
   {
     propertyId: property._id,

     visitorId: visitor._id,

     status: {
       $in: ['waiting', 'queued', 'active'],
     },
   },
   {
     $setOnInsert: {
       propertyId: property._id,

       visitorId: visitor._id,

       status: 'waiting',

       channel: 'widget',

       visitorJoinedAt: new Date(),

       lastActivityAt: new Date(),
     },
   },
   {
     upsert: true,
     new: true,
   },
 )

  return {
    sessionId: session._id.toString(),

    propertyId: session.propertyId.toString(),

    visitorId: session.visitorId.toString(),

    status: session.status,
  }
}