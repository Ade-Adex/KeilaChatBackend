// /src/models/Account.ts
import { Schema, model } from 'mongoose'
import type { IAccount } from '../types/account.types.js'

const AccountSchema = new Schema<IAccount>(
  {
    name: { type: String, required: true },

    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },

    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    isActive: { type: Boolean, default: true },

    settings: {
      aiEnabled: { type: Boolean, default: true },
      maxOperators: { type: Number, default: 5 },
      maxVisitors: { type: Number, default: 1000 },
    },
  },
  { timestamps: true },
)

export default model<IAccount>('Account', AccountSchema)