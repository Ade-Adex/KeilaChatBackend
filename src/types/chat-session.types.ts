// /src/types/chat-session.types.ts

import type { Types } from 'mongoose'
import type { BaseEntity } from './common.types.js'

export type ChatStatus =
  | 'queued'
  | 'active'
  | 'waiting'
  | 'closed'
  | 'transferred'

export type ChatPriority = 'low' | 'normal' | 'high'
export type ChatChannel = 'widget' | 'api'

export type ClosedBy = 'visitor' | 'operator' | 'system'

export interface ChatRating {
  stars?: number

  feedback?: string

  submittedAt?: Date
}

export interface ChatAnalytics {
  totalMessages: number

  visitorMessages: number

  operatorMessages: number

  aiMessages: number

  averageReplyTime: number

  duration: number
}

export interface InternalNote {
  operatorId: Types.ObjectId

  note: string

  createdAt: Date
}

export interface VisitorContext {
  ip?: string
  userAgent?: string
  currentPage?: string
  referrer?: string
}

export interface IChatSession extends BaseEntity {
  propertyId: Types.ObjectId

  visitorId: Types.ObjectId

  assignedOperatorId?: Types.ObjectId | null

  transferredTo?: Types.ObjectId | null

  sessionNumber?: number

  status: ChatStatus

  priority: ChatPriority

  channel: ChatChannel

  aiEnabled: boolean

  aiHandled: boolean

  aiEscalated: boolean

  aiConfidenceScore?: number

  visitorContext: VisitorContext

  queuePosition?: number

  unreadVisitor: number

  unreadOperator: number

  visitorTyping: boolean

  operatorTyping: boolean

  lastMessage?: string

  lastMessageAt?: Date

  archived: boolean

  closedBy?: ClosedBy

  rating?: ChatRating

  analytics: ChatAnalytics

  visitorJoinedAt: Date

  operatorJoinedAt: Date

  lastActivityAt: Date

  internalNotes: InternalNote[]

  aiSummary?: string

  conversationIntent?: string

  sentiment?: string

  startedAt?: Date

  firstResponseAt?: Date

  endedAt?: Date

  waitTimeMs?: number

  resolutionTimeMs?: number
}