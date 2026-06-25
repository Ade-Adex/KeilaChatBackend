// /src/models/Notification.ts

import { Schema, model, Types } from 'mongoose'
import type { INotification } from '../types/notification.types.js'

const NotificationSchema = new Schema<INotification>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
    },

    userId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    type: {
      type: String,
      enum: [
        'message',
        'system',
        'ai',
        'assignment',
        'queue',
        'alert',
        'security',
      ],
      required: true,
    },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    status: {
      type: String,
      enum: ['unread', 'read'],
      default: 'unread',
    },

    data: { type: Schema.Types.Mixed },

    readAt: Date,
  },
  { timestamps: true },
)

NotificationSchema.index({ accountId: 1, status: 1 })

export default model<INotification>('Notification', NotificationSchema)
