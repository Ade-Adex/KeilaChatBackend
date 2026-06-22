// /src/models/Operator.ts

import { Schema, model } from 'mongoose'
import type { Document, Types } from 'mongoose'

// /src/models/Operator.ts

export interface IOperator extends Document {
  accountId: Types.ObjectId
  firstName?: string | undefined  
  lastName?: string | undefined   
  email: string
  passwordHash?: string | undefined 
  role: 'admin' | 'agent'
  status: 'invited' | 'active' 
  inviteToken?: string | undefined 
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
      required: false, 
      trim: true,
    },
    lastName: {
      type: String,
      required: false, 
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
      required: false, 
    },
    role: {
      type: String,
      enum: ['admin', 'agent'],
      default: 'agent',
    },
    status: {
      type: String,
      enum: ['invited', 'active'],
      default: 'invited', 
    },
    inviteToken: {
      type: String,
      required: false,
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
