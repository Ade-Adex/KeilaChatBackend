// /src/models/Visitor.ts

import { Schema, model } from 'mongoose'
import type { Document, Types } from 'mongoose'

export interface IVisitor extends Document {
  propertyId: Types.ObjectId
  visitorTrackingId: string
  name: string
  email: string | null
  metadata: {
    ipAddress?: string
    userAgent?: string
    location?: {
      country?: string
      city?: string
    }
  }
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
}

const VisitorSchema = new Schema<IVisitor>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    visitorTrackingId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: 'Anonymous Visitor',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      location: {
        country: String,
        city: String,
      },
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

// Indexing compound keys to eliminate duplicate tracking models per layout instances
VisitorSchema.index({ propertyId: 1, visitorTrackingId: 1 }, { unique: true })

export default model<IVisitor>('Visitor', VisitorSchema)