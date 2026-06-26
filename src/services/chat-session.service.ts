// /src/services/chat-session.service.ts

import ChatSession from '../models/ChatSession.js'
import Visitor from '../models/Visitor.js'
import Property from '../models/Property.js'
import Operator from '../models/Operator.js'
import { Types } from 'mongoose'

import { AppError } from './appError.js'

interface VisitorPayload {
  propertyId: string
  visitorTrackingId: string

  currentPage?: string | undefined
  referrer?: string | undefined
  userAgent?: string | undefined
  ipAddress?: string | undefined
}

export async function findOrCreateVisitor(payload: VisitorPayload) {
  const {
    propertyId,
    visitorTrackingId,
    currentPage,
    referrer,
    userAgent,
    ipAddress,
  } = payload

  const visitor = await Visitor.findOneAndUpdate(
    {
      propertyId,
      visitorTrackingId,
    },
    {
      $set: {
        currentPage,
        referrer,
        isOnline: true,
        lastSeen: new Date(),

        metadata: {
          userAgent,
          ipAddress,
        },
      },

      $inc: {
        pageViews: 1,
      },

      $setOnInsert: {
        name: 'Anonymous Visitor',
        firstVisitAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )

  return visitor
}

export async function findOrCreateSession(
  propertyId: string,
  visitorId: string,
  visitorContext?: {
    ip?: string
    userAgent?: string
    currentPage?: string
    referrer?: string
  },
) {
  /*
   * Try to find existing open session
   */
  let session = await ChatSession.findOne({
    propertyId,
    visitorId,
    status: {
      $in: ['queued', 'waiting', 'active'],
    },
  }).sort({
    createdAt: -1,
  })

  /*
   * Return existing session
   */
  if (session) {
    session.lastActivityAt = new Date()

    if (visitorContext?.currentPage) {
      session.visitorContext.currentPage = visitorContext.currentPage
    }

    if (visitorContext?.referrer) {
      session.visitorContext.referrer = visitorContext.referrer
    }

    await session.save()

    return session
  }

  /*
   * Create new session
   */
  session = await ChatSession.create({
    propertyId,
    visitorId,

    visitorContext: {
      ...(visitorContext?.ip && {
        ip: visitorContext.ip,
      }),

      ...(visitorContext?.userAgent && {
        userAgent: visitorContext.userAgent,
      }),

      ...(visitorContext?.currentPage && {
        currentPage: visitorContext.currentPage,
      }),

      ...(visitorContext?.referrer && {
        referrer: visitorContext.referrer,
      }),
    },

    status: 'queued',

    priority: 'normal',

    channel: 'widget',

    aiEnabled: true,
    aiHandled: false,
    aiEscalated: false,

    unreadVisitor: 0,
    unreadOperator: 0,

    visitorTyping: false,
    operatorTyping: false,

    archived: false,

    analytics: {
      totalMessages: 0,
      visitorMessages: 0,
      operatorMessages: 0,
      aiMessages: 0,
      averageReplyTime: 0,
      duration: 0,
    },

    internalNotes: [],

    visitorJoinedAt: new Date(),

    startedAt: new Date(),

    lastActivityAt: new Date(),
  })

  return session
}

export async function assignOperator(accountId: string) {
  const operator = await Operator.findOne({
    accountId,
    isOnline: true,
    status: 'active',
    availabilityStatus: 'online',
    $expr: {
      $lt: ['$activeChatsCount', '$maxConcurrentChats'],
    },
  }).sort({
    activeChatsCount: 1,
  })

  return operator
}

export async function initializeChat(
  widgetId: string,
  visitorTrackingId: string,
  metadata: {
    currentPage?: string
    referrer?: string
    userAgent?: string
    ipAddress?: string
  },
) {
  const property = await Property.findOne({
    widgetId,
  })

  if (!property) {
    throw new AppError('Property not found', 404)
  }

  const visitor = await findOrCreateVisitor({
    propertyId: property._id.toString(),
    visitorTrackingId,

    currentPage: metadata.currentPage,
    referrer: metadata.referrer,
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
  })

  const session = await findOrCreateSession(
    property._id.toString(),
    visitor._id.toString(),
    {
      ...(metadata.ipAddress && {
        ip: metadata.ipAddress,
      }),

      ...(metadata.userAgent && {
        userAgent: metadata.userAgent,
      }),

      ...(metadata.currentPage && {
        currentPage: metadata.currentPage,
      }),

      ...(metadata.referrer && {
        referrer: metadata.referrer,
      }),
    },
  )
}


export async function closeChat(
  sessionId: string,
  closedBy: 'visitor' | 'operator' | 'system',
) {
  const session = await ChatSession.findById(sessionId)

  if (!session) {
    throw new AppError('Session not found', 404)
  }

  session.status = 'closed'

  session.closedBy = closedBy

  session.endedAt = new Date()

  session.archived = true

  await session.save()

  if (session.assignedOperatorId) {
    await Operator.updateOne(
  {
    _id: new Types.ObjectId(
      session.assignedOperatorId.toString(),
    ),
  },
  {
    $inc: {
      activeChatsCount: -1,
    },
  },
)
  }

  return session
}

// assignSessionToOperator

export async function assignSessionToOperator(
  sessionId: string,
  operatorId: string,
) {
  const session = await ChatSession.findById(sessionId)

  if (!session) {
    throw new AppError('Session not found', 404)
  }

  session.assignedOperatorId = new Types.ObjectId(operatorId)
  session.status = 'active'

  await session.save()

  await Operator.updateOne(
    { _id: operatorId },
    {
      $inc: {
        activeChatsCount: 1,
      },
    },
  )

  return session
}


// updateTypingStatus

export async function updateTypingStatus(
  sessionId: string,
  type: 'visitor' | 'operator',
  value: boolean,
) {
  return ChatSession.findByIdAndUpdate(
    sessionId,
    {
      [type === 'visitor' ? 'visitorTyping' : 'operatorTyping']: value,
    },
    {
      new: true,
    },
  )
}


// addInternalNote
// "Customer requested refund."

export async function addInternalNote(
  sessionId: string,
  operatorId: string,
  note: string,
) {
  return ChatSession.findByIdAndUpdate(
    sessionId,
    {
      $push: {
        internalNotes: {
          operatorId: new Types.ObjectId(operatorId),
          note,
          createdAt: new Date(),
        },
      },
    },
    {
      new: true,
    },
  )
}

// Operator join chat

export async function operatorJoinChat(sessionId: string, operatorId: string) {
  const session = await ChatSession.findById(sessionId)

  if (!session) {
    throw new AppError('Session not found', 404)
  }

  session.assignedOperatorId = new Types.ObjectId(operatorId)
  session.status = 'active'

  if (!session.firstResponseAt) {
    session.firstResponseAt = new Date()
  }

  await session.save()

  await Operator.updateOne(
    { _id: operatorId },
    {
      $inc: {
        activeChatsCount: 1,
      },
    },
  )

  return session
}

// Operator leave chat

export async function operatorLeaveChat(sessionId: string, operatorId: string) {
  const session = await ChatSession.findById(sessionId)

  if (!session) {
    throw new AppError('Session not found', 404)
  }

  session.status = 'waiting'
  session.assignedOperatorId = null

  await session.save()

  await Operator.updateOne(
    {
      _id: operatorId,
    },
    {
      $inc: {
        activeChatsCount: -1,
      },
    },
  )

  return session
}

// // Transfer chat to another agent


export async function transferChat(
  sessionId: string,
  fromOperatorId: string,
  toOperatorId: string,
) {
  const session = await ChatSession.findById(sessionId)

  if (!session) {
    throw new AppError('Session not found', 404)
  }

  session.assignedOperatorId = new Types.ObjectId(toOperatorId)
  session.transferredTo = new Types.ObjectId(toOperatorId) 
  session.status = 'transferred'

  await session.save()

  await Operator.updateOne(
    { _id: fromOperatorId },
    {
      $inc: {
        activeChatsCount: -1,
      },
    },
  )

  await Operator.updateOne(
    { _id: toOperatorId },
    {
      $inc: {
        activeChatsCount: 1,
      },
    },
  )

  return session
}

// Typing indicators

export async function updateTyping(
  sessionId: string,
  actor: 'visitor' | 'operator',
  typing: boolean,
) {
  const update =
    actor === 'visitor' ? { visitorTyping: typing } : { operatorTyping: typing }

  return ChatSession.findByIdAndUpdate(sessionId, update, { new: true })
}


// Session rating

export async function rateSession(
  sessionId: string,
  stars: number,
  feedback?: string,
) {
  return ChatSession.findByIdAndUpdate(
    sessionId,
    {
      rating: {
        stars,
        feedback,
        submittedAt: new Date(),
      },
    },
    {
      new: true,
    },
  )
  }