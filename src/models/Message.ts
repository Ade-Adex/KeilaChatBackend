//  /src/models/Message.ts

import { Schema, model } from 'mongoose'
import type { Document, Types } from 'mongoose'

export interface IAttachment {
  fileUrl: string
  fileType: string
  fileName: string
}

export interface IMessage extends Document {
  sessionId: Types.ObjectId
  senderType: 'visitor' | 'operator' | 'system'
  senderId: Types.ObjectId
  senderName?: string
  messageText: string
  attachments: IAttachment[]
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ['visitor', 'operator', 'system'],
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    senderName: {
      type: String,
      required: false,
    },
    messageText: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        fileUrl: String,
        fileType: String,
        fileName: String,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

// High-speed index to pull history packages sequentially
MessageSchema.index({ sessionId: 1, createdAt: 1 })

export default model<IMessage>('Message', MessageSchema)