// /src/types/notification.types.ts

import type { Types } from 'mongoose'
import type { BaseEntity } from './common.types.js'

export type NotificationType =
  | 'message'
  | 'system'
  | 'ai'
  | 'assignment'
  | 'queue'
  | 'alert'
  | 'security'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NotificationStatus = 'unread' | 'read'

export interface INotification extends BaseEntity {
  accountId: Types.ObjectId
  propertyId?: Types.ObjectId
  userId?: Types.ObjectId

  title: string
  message: string

  type: NotificationType
  priority: NotificationPriority

  status: NotificationStatus

  data?: Record<string, any>

  readAt?: Date
}
