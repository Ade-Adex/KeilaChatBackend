//  /src/models/Message.ts

import { Schema, model } from 'mongoose'
import type { IMessage } from '../types/message.types.js'

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
      enum: ['visitor', 'operator', 'ai', 'system'],
      required: true,
    },

    senderId: { type: String, required: true },

    messageText: { type: String, required: true },

    messageType: {
      type: String,
      enum: [
        'text',
        'image',
        'video',
        'audio',
        'file',
        'system',
        'event',
        'note',
        'ai_suggestion',
      ],
      default: 'text',
    },

    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen', 'failed'],
      default: 'sent',
    },

    isFromAI: { type: Boolean, default: false },

    aiMetadata: {
      model: String,
      confidence: Number,
      intent: String,
    },

    attachments: [
      {
        fileUrl: String,
        fileType: String,
        fileName: String,
      },
    ],

    readBy: [
      {
        operatorId: String,
        readAt: Date,
      },
    ],

    replyTo: {
      type: Schema.Types.ObjectId,

      ref: 'Message',
    },
    reactions: [
      {
        emoji: String,
        operatorId: String,
      },
    ],
    deletedAt: Date,

    deletedBy: String,

    deliveredAt: Date,

    seenAt: Date,
    editedAt: Date,
  },
  { timestamps: true },
)

MessageSchema.index({ sessionId: 1, createdAt: 1 })

export default model<IMessage>('Message', MessageSchema)
