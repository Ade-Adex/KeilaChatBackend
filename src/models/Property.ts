// /src/models/Property.ts
import { Schema, model } from 'mongoose'
import type { Document, Types } from 'mongoose'

export interface IProperty extends Document {
  accountId: Types.ObjectId
  name: string
  domain: string
  widgetId: string
  apiKey: string
  details: {
    category: string
    subCategory: string
    region: string
    description: string
    propertyImageUrl: string
  }
  settings: {
    themeColor: string
    headingText: string
    onlineStatus: boolean
    trackIp: boolean
  }
}

const PropertySchema = new Schema<IProperty>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    widgetId: { type: String, required: true, unique: true },
    apiKey: { type: String, required: true, unique: true },
    details: {
      category: { type: String, default: 'General' },
      subCategory: { type: String, default: '' },
      region: { type: String, default: 'Global' },
      description: { type: String, default: '' },
      propertyImageUrl: { type: String, default: '' },
    },
    settings: {
      themeColor: { type: String, default: '#0070f3' },
      headingText: { type: String, default: 'Chat with us!' },
      onlineStatus: { type: Boolean, default: true },
      trackIp: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
)

export default model<IProperty>('Property', PropertySchema)
