// /src/models/Account.ts

import { Schema, model } from 'mongoose'
import type { Document } from 'mongoose'

export interface IAccount extends Document {
  name: string
  ownerEmail: string
  passwordHash: string
  plan: 'free' | 'premium'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const AccountSchema = new Schema<IAccount>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

export default model<IAccount>('Account', AccountSchema)