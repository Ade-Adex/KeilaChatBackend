// /src/models/Operator.ts

import { Schema, model } from 'mongoose'
import type { IOperator } from '../types/operator.types.js'

const OperatorSchema = new Schema<IOperator>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    firstName: String,

    lastName: String,

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: String,

    avatar: {
      type: String,
      default: '',
    },

    role: {
      type: String,
      enum: ['admin', 'supervisor', 'agent'],
      default: 'agent',
    },

    status: {
      type: String,
      enum: ['invited', 'active', 'suspended'],
      default: 'invited',
    },

    inviteToken: String,

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    assignedProperties: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],

    socketId: String,

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: Date,
    isTyping: {
      type: Boolean,
      default: false,
    },
    currentSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatSession',
    },
    stats: {
      chatsHandled: {
        type: Number,
        default: 0,
      },

      averageResponseTime: {
        type: Number,
        default: 0,
      },

      satisfactionScore: {
        type: Number,
        default: 0,
      },
    },
    lastTypingAt: Date,

    joinedAt: Date,

    availabilityStatus: {
      type: String,
      enum: ['online', 'away', 'busy', 'offline'],
      default: 'offline',
    },

    activeChatsCount: {
      type: Number,
      default: 0,
    },

    maxConcurrentChats: {
      type: Number,
      default: 5,
    },

    permissions: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  },
)

OperatorSchema.index(
  {
    accountId: 1,
    email: 1,
  },
  {
    unique: true,
  },
)

export default model<IOperator>('Operator', OperatorSchema)
