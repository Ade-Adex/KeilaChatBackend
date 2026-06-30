// /src/services/session.service.ts

import ChatSession from '../models/ChatSession.js'
import Property from '../models/Property.js'
import Visitor from '../models/Visitor.js'

import { AppError } from './appError.js'

interface PopulatedOperatorDoc {
  _id: { toString(): string }
  firstName?: string
  lastName?: string
  avatar?: string
}

export async function getSessionById(sessionId: string) {
  const session = await ChatSession.findById(sessionId)
    .populate({
      path: 'assignedOperatorId',
      select: 'firstName lastName email avatar accountId',
      populate: {
        path: 'accountId',
        select: 'name', // Pulls the Account's name property cleanly
      },
    })
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

/* -------------------------------------------------------------------------- */
/* UPDATED: Catching both 'queued' and 'waiting' incoming stream states      */
/* -------------------------------------------------------------------------- */
export async function getQueuedSessions(propertyId: string) {
  return ChatSession.find({
    propertyId,
    status: { $in: ['queued', 'waiting'] }, // <-- Changed to accept both variants
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

  const targetStatuses = createNew
    ? ['waiting', 'queued', 'active']
    : ['waiting', 'queued', 'active', 'closed']

  // 🎯 FIX 1 & 2: Cast the query condition explicitly to avoid overload mismatches,
  // and type-cast the response or read from `session` assuming it returns the document or type correctly.
  const session = await ChatSession.findOneAndUpdate(
    {
      propertyId: property._id,
      visitorId: visitor._id,
      status: {
        $in: targetStatuses,
      } as any, // Cast to any bypassing complex schema internal strict type inference mismatches
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
  ).lean() // Using .lean() here makes Mongoose return the plain document object directly instead of a ModifyResult shell!

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
      firstName: operatorDoc.firstName || '',
      lastName: operatorDoc.lastName || '',
      avatar: operatorDoc.avatar || '',
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