// /src/models/Property.ts

import { Schema, model } from 'mongoose'
import type { IProperty } from '../types/property.types.js'

const PropertySchema = new Schema<IProperty>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    name: { type: String, required: true },
    domain: { type: String, required: true },

    allowedDomains: [{ type: String }],

    widgetId: { type: String, required: true, unique: true },
    apiKey: { type: String, required: true, unique: true },

    details: {
      category: String,
      subCategory: String,
      region: String,
      description: String,
      logoUrl: String,
    },

    settings: {
      themeColor: { type: String, default: '#0070f3' },
      headingText: { type: String, default: 'Chat with us' },

      onlineStatus: { type: Boolean, default: true },
      trackIp: { type: Boolean, default: true },

      autoAssign: { type: Boolean, default: true },
      aiEnabled: { type: Boolean, default: true },
      aiFallbackToHuman: { type: Boolean, default: true },

      responseTimeGoalMs: Number,
    },

    workingHours: {
      enabled: { type: Boolean, default: false },
      timezone: String,
      schedule: Schema.Types.Mixed,
    },
  },
  { timestamps: true },
)

export default model<IProperty>('Property', PropertySchema)