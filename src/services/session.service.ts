// /src/services/session.service.ts

import ChatSession from '../models/ChatSession.js'
import Property from '../models/Property.js'
import Visitor from '../models/Visitor.js'

import { AppError } from './appError.js'

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
}: {
  widgetId: string
  visitorTrackingId: string
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

  // CRITICAL CORRECTION: Deeply fetch and populate the assigned operator along with their company Account details
  const populatedSession = await ChatSession.findById(session._id)
    .populate({
      path: 'assignedOperatorId',
      select: 'firstName lastName email avatar accountId',
      populate: {
        path: 'accountId',
        select: 'name',
      },
    })
    .lean()

  return {
    sessionId: session._id.toString(),
    propertyId: session.propertyId.toString(),
    visitorId: session.visitorId.toString(),
    status: session.status,
    assignedOperatorId: populatedSession?.assignedOperatorId || null, // <-- Appended to return body payload
  }
}