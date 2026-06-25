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

    startedAt: Date,
    firstResponseAt: Date,
    endedAt: Date,

    waitTimeMs: Number,
    resolutionTimeMs: Number,
  },
  { timestamps: true },
)

ChatSessionSchema.index({ propertyId: 1, status: 1 })

export default model<IChatSession>('ChatSession', ChatSessionSchema)