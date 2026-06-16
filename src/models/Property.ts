// /src/models/Property.ts

import { Schema, model } from 'mongoose'
import type { Document, Types } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

export interface IProperty extends Document {
  accountId: Types.ObjectId
  name: string
  domain: string
  widgetId: string
  settings: {
    themeColor: string
    headingText: string
    onlineStatus: boolean
  }
  createdAt: Date
  updatedAt: Date
}

const PropertySchema = new Schema<IProperty>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
    },
    widgetId: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    settings: {
      themeColor: { type: String, default: '#0070f3' },
      headingText: { type: String, default: 'Chat with us!' },
      onlineStatus: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
)

export default model<IProperty>('Property', PropertySchema)