// /src/models/ChatSession.ts

import { Schema, model } from 'mongoose'
import type { IChatSession } from '../types/chat-session.types.js'

const ChatSessionSchema = new Schema<IChatSession>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    visitorId: {
      type: Schema.Types.ObjectId,
      ref: 'Visitor',
      required: true,
      index: true,
    },

    assignedOperatorId: {
      type: Schema.Types.ObjectId,
      ref: 'Operator',
      default: null,
    },

    status: {
      type: String,
      enum: ['queued', 'active', 'waiting', 'closed', 'transferred'],
      default: 'queued',
    },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },

    channel: {
      type: String,
      enum: ['widget', 'api'],
      default: 'widget',
    },

    aiEnabled: { type: Boolean, default: true },
    aiHandled: { type: Boolean, default: false },
    aiEscalated: { type: Boolean, default: false },

    aiConfidenceScore: Number,

    visitorContext: {
      ip: String,
      userAgent: String,
      currentPage: String,
      referrer: String,
    },
    transferredTo: {
      type: Schema.Types.ObjectId,
      ref: 'Operator',
      default: null,
    },
    sessionNumber: Number,
    closedBy: {
      type: String,

      enum: ['visitor', 'operator', 'system'],
    },
    analytics: {
      totalMessages: {
        type: Number,
        default: 0,
      },

      visitorMessages: {
        type: Number,
        default: 0,
      },

      operatorMessages: {
        type: Number,
        default: 0,
      },

      aiMessages: {
        type: Number,
        default: 0,
      },

      averageReplyTime: {
        type: Number,
        default: 0,
      },

      duration: {
        type: Number,
        default: 0,
      },
    },
    internalNotes: [
      {
        operatorId: {
          type: Schema.Types.ObjectId,

          ref: 'Operator',
        },

        note: String,

        createdAt: Date,
      },
    ],
    aiSummary: String,

    conversationIntent: String,

    sentiment: String,
    rating: {
      stars: Number,

      feedback: String,

      submittedAt: Date,
    },
    queuePosition: Number,
    unreadVisitor: {
      type: Number,
      default: 0,
    },

    unreadOperator: {
      type: Number,
      default: 0,
    },
    lastMessage: String,

    lastMessageAt: Date,

    visitorTyping: {
      type: Boolean,
      default: false,
    },

    operatorTyping: {
      type: Boolean,
      default: false,
    },
    archived: {
      type: Boolean,
      default: false,
    },

    startedAt: Date,
    firstResponseAt: Date,
    endedAt: Date,

    visitorJoinedAt: Date,

    operatorJoinedAt: Date,

    lastActivityAt: Date,

    waitTimeMs: Number,
    resolutionTimeMs: Number,
  },
  { timestamps: true },
)

ChatSessionSchema.index({ propertyId: 1, status: 1 })
ChatSessionSchema.index({
  assignedOperatorId: 1,
  status: 1,
})

ChatSessionSchema.index({
  visitorId: 1,
})

ChatSessionSchema.index({
  propertyId: 1,
  queuePosition: 1,
})

ChatSessionSchema.index({
  lastActivityAt: -1,
})

export default model<IChatSession>('ChatSession', ChatSessionSchema)
