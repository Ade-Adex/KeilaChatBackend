// /src/types/visitor.types.ts

import type { Types } from 'mongoose'
import type { BaseEntity } from './common.types.js'

export interface VisitorMetadata {
  ipAddress?: string

  userAgent?: string

  browser?: string

  operatingSystem?: string

  timezone?: string

  language?: string

  screenResolution?: string

  location?: {
    country?: string

    city?: string
  }

  deviceType?: 'mobile' | 'desktop' | 'tablet'
}

export interface IVisitor extends BaseEntity {
  propertyId: Types.ObjectId

  visitorTrackingId: string

  name: string

  email?: string | null

  sessionId?: string

  metadata: VisitorMetadata

  currentPage?: string

  referrer?: string

  isOnline: boolean

  joinedAt: Date

  lastTypingAt?: Date

  lastSeen: Date

  firstVisitAt?: Date

  pageViews: number

  chatOpened: boolean

  unreadMessages: number

  tags: string[]

  notes?: string
}