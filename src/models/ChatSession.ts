// /src/models/ChatSession.ts

import { Schema, model } from 'mongoose'
import type { Document, Types } from 'mongoose'

export interface IChatSession extends Document {
  propertyId: Types.ObjectId
  visitorId: Types.ObjectId
  assignedOperatorId: Types.ObjectId | null
  status: 'unassigned' | 'active' | 'closed'
  endedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

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
      index: true,
    },
    status: {
      type: String,
      enum: ['unassigned', 'active', 'closed'],
      default: 'unassigned',
      index: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
)

export default model<IChatSession>('ChatSession', ChatSessionSchema)