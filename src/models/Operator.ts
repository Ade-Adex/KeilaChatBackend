// /src/models/Operator.ts

import { Schema, model } from 'mongoose'
import type { Document, Types } from 'mongoose'

export interface IOperator extends Document {
  accountId: Types.ObjectId
  firstName: string
  lastName: string
  email: string
  passwordHash: string
  role: 'admin' | 'agent'
  assignedProperties: Types.ObjectId[]
  isOnline: boolean
  createdAt: Date
  updatedAt: Date
}

const OperatorSchema = new Schema<IOperator>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'agent'],
      default: 'agent',
    },
    assignedProperties: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

// Enforce unique agent logins within a tenant account ecosystem
OperatorSchema.index({ accountId: 1, email: 1 }, { unique: true })

export default model<IOperator>('Operator', OperatorSchema)