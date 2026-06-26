// /src/types/operator.types.ts

import type { Types } from 'mongoose'
import type { BaseEntity } from './common.types.js'

export type OperatorRole = 'admin' | 'supervisor' | 'agent'
export type OperatorStatus = 'invited' | 'active' | 'suspended'

export type AvailabilityStatus = 'online' | 'away' | 'busy' | 'offline'

export interface OperatorStatistics {
  chatsHandled: number

  averageResponseTime: number

  satisfactionScore: number
}

export interface IOperator extends BaseEntity {
  accountId: Types.ObjectId

  firstName?: string

  lastName?: string

  email: string

  passwordHash?: string

  avatar?: string

  role: OperatorRole

  status: OperatorStatus

  inviteToken?: string | null

  resetPasswordToken?: string | null

  resetPasswordExpires?: Date | null

  assignedProperties: Types.ObjectId[]

  socketId?: string

  isOnline: boolean

  lastSeen?: Date

  availabilityStatus: AvailabilityStatus

  activeChatsCount: number

  maxConcurrentChats: number

  permissions: string[]

  currentSessionId?: Types.ObjectId | null

  isTyping: boolean

  lastTypingAt?: Date

  joinedAt?: Date

  stats: OperatorStatistics
}