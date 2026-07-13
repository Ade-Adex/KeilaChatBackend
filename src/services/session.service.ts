// /src/services/session.service.ts


import mongoose from 'mongoose'
import ChatSession from '../models/ChatSession.js'
import Property from '../models/Property.js'
import Visitor from '../models/Visitor.js'

import { AppError } from './appError.js'
import { EventService } from './event.service.js'
import { createSystemMessage } from './message.service.js'

interface PopulatedOperatorDoc {
  _id: { toString(): string }
  firstName?: string
  lastName?: string
  avatar?: string
}

const VISITOR_POPULATE_FIELDS =
  'name email metadata tags notes firstVisitAt unreadMessages currentPage referrer isOnline lastSeen pageViews chatOpened'

export async function getSessionById(sessionId: string) {
  const session = await ChatSession.findById(sessionId)
    .populate({
      path: 'assignedOperatorId',
      select: 'firstName lastName email avatar accountId',
      populate: {
        path: 'accountId',
        select: 'name',
      },
    })
    .populate('visitorId', VISITOR_POPULATE_FIELDS) 

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
    .populate('assignedOperatorId', 'firstName lastName avatar')
    .populate('visitorId', VISITOR_POPULATE_FIELDS) // 🎯 FIXED
}

export async function getQueuedSessions(propertyId: string) {
  return ChatSession.find({
    propertyId,
    status: { $in: ['queued', 'waiting'] },
  })
    .sort({
      createdAt: 1,
    })
    .populate('visitorId', VISITOR_POPULATE_FIELDS) // 🎯 FIXED
}

export async function getOperatorChatHistory(operatorId: string) {
  return ChatSession.find({
    assignedOperatorId: operatorId,
  })
    .sort({
      updatedAt: -1,
    })
    .populate('visitorId', VISITOR_POPULATE_FIELDS) // 🎯 FIXED
}

export async function getPropertySessions(propertyId: string) {
  return ChatSession.find({
    propertyId,
  })
    .sort({
      createdAt: -1,
    })
    .populate('assignedOperatorId', 'firstName lastName avatar')
    .populate('visitorId', VISITOR_POPULATE_FIELDS) // 🎯 FIXED
}

export async function getOpenSessionCount(propertyId: string) {
  return ChatSession.countDocuments({
    propertyId,
    status: {
      $in: ['queued', 'active', 'waiting'],
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
  createNew = false,
}: {
  widgetId: string
  visitorTrackingId: string
  createNew?: boolean
}) {
  const property = await Property.findOne({ widgetId })
  if (!property) {
    throw new AppError('Invalid widget', 404)
  }

  const visitor = await Visitor.findOne({
    propertyId: property._id,
    visitorTrackingId,
  })
  if (!visitor) {
    throw new AppError('Visitor not found', 404)
  }

  const targetStatuses: ('waiting' | 'queued' | 'active')[] = [
    'waiting',
    'queued',
    'active',
  ]

  let session = await ChatSession.findOne({
    propertyId: property._id,
    visitorId: visitor._id,
    status: { $in: targetStatuses },
  }).lean()

  if (!session || createNew) {
    session = await ChatSession.create({
      propertyId: property._id,
      visitorId: visitor._id,
      status: 'waiting',
      channel: 'widget',
      visitorJoinedAt: new Date(),
      lastActivityAt: new Date(),
    }).then((doc) => doc.toObject())

    await mongoose
      .model('Account')
      .updateOne(
        { _id: property.accountId },
        { $inc: { 'usage.totalChats': 1 } },
      )
  }

  if (!session) {
    throw new AppError(
      'Failed to initialize or find session mapping context',
      500,
    )
  }

  const populatedSession = await ChatSession.findById(session._id)
    .populate({
      path: 'assignedOperatorId',
      select: 'firstName lastName email avatar accountId',
    })
    .lean()

  const operatorDoc =
    populatedSession?.assignedOperatorId as unknown as PopulatedOperatorDoc | null
  let customOperatorPayload = null

  if (operatorDoc) {
    customOperatorPayload = {
      _id: operatorDoc._id ? operatorDoc._id.toString() : '',
      firstName: operatorDoc.firstName
        ? operatorDoc.firstName.trim()
        : 'Support Agent',
      lastName: operatorDoc.lastName ? operatorDoc.lastName.trim() : '',
      avatar: operatorDoc.avatar || '',
      email: '',
    }
  }

  return {
    sessionId: session._id.toString(),
    propertyId: session.propertyId.toString(),
    visitorId: session.visitorId.toString(),
    status: session.status,
    assignedOperatorId: customOperatorPayload,
  }
}

export async function closeChatSession(sessionId: string, closedBy: string) {
  const session = await ChatSession.findByIdAndUpdate(
    sessionId,
    {
      status: 'closed',
      closedAt: new Date(),
    },
    { returnDocument: 'after' },
  )

  if (!session) {
    throw new AppError('Chat session not found', 404)
  }

  await createSystemMessage(sessionId, `Conversation ended by ${closedBy}`)

  EventService.emitToProperty(
    session.propertyId.toString(),
    'session_status_changed',
    {
      sessionId: session._id.toString(),
      status: 'closed',
    },
  )

  EventService.emitToSession(sessionId.toString(), 'session_status_changed', {
    sessionId: session._id.toString(),
    status: 'closed',
  })

  return session
}