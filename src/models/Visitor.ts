// /src/models/Visitor.ts

import { Schema, model } from 'mongoose'
import type { IVisitor } from '../types/visitor.types.js'

const VisitorSchema = new Schema<IVisitor>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    visitorTrackingId: { type: String, required: true },

    name: { type: String, default: 'Anonymous Visitor' },
    email: { type: String, default: null },

    sessionId: String,

    metadata: {
      ipAddress: String,
      userAgent: String,

      browser: String,
      operatingSystem: String,
      timezone: String,
      language: String,
      screenResolution: String,

      location: {
        country: String,
        city: String,
      },

      deviceType: {
        type: String,
        enum: ['mobile', 'desktop', 'tablet'],
      },
    },

    tags: [String],
    notes: String,
    firstVisitAt: {
      type: Date,
      default: Date.now,
    },
    unreadMessages: {
      type: Number,
      default: 0,
    },
    
    lastTypingAt: Date,

    joinedAt: Date,

    currentPage: String,
    referrer: String,

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    pageViews: { type: Number, default: 0 },
    chatOpened: { type: Boolean, default: false },
  },
  { timestamps: true },
)

VisitorSchema.index({ propertyId: 1, visitorTrackingId: 1 }, { unique: true })

export default model<IVisitor>('Visitor', VisitorSchema)
