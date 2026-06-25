// /src/types/chat-session.types.ts

import type { Types } from "mongoose"
import type  { BaseEntity } from './common.types.js'

export type ChatStatus =
  | 'queued'
  | 'active'
  | 'waiting'
  | 'closed'
  | 'transferred'

export type ChatPriority = 'low' | 'normal' | 'high'
export type ChatChannel = 'widget' | 'api'

export interface VisitorContext {
  ip?: string
  userAgent?: string
  currentPage?: string
  referrer?: string
}

export interface IChatSession extends BaseEntity {
  propertyId: Types.ObjectId
  visitorId: Types.ObjectId

  assignedOperatorId?: string | null

  status: ChatStatus
  priority: ChatPriority
  channel: ChatChannel

  aiEnabled: boolean
  aiHandled: boolean
  aiEscalated: boolean
  aiConfidenceScore?: number

  visitorContext: VisitorContext

  startedAt?: Date
  firstResponseAt?: Date
  endedAt?: Date

  waitTimeMs?: number
  resolutionTimeMs?: number
}