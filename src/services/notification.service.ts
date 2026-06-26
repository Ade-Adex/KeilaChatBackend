// /src/services/notification.service.ts

import { Types } from 'mongoose'

import Notification from '../models/Notification.js'
import { EventService } from './event.service.js'

import type {
  NotificationPriority,
  NotificationType,
} from '../types/notification.types.js'

export interface CreateNotificationPayload {
  accountId: string

  propertyId?: string

  userId?: string

  title: string

  message: string

  type: NotificationType

  priority?: NotificationPriority

  actionUrl?: string

  icon?: string

  expiresAt?: Date

  data?: Record<string, any>
}

export class NotificationService {
  /*
   ********************************
   * CREATE NOTIFICATION
   ********************************
   */
  static async create(payload: CreateNotificationPayload) {
    const notificationPayload: Record<string, any> = {
      accountId: new Types.ObjectId(payload.accountId),

      title: payload.title,

      message: payload.message,

      type: payload.type,

      priority: payload.priority ?? 'normal',

      actionUrl: payload.actionUrl,

      icon: payload.icon,

      expiresAt: payload.expiresAt,

      data: payload.data,

      status: 'unread',

      dismissed: false,
    }

    if (payload.propertyId) {
      notificationPayload.propertyId = new Types.ObjectId(payload.propertyId)
    }

    if (payload.userId) {
      notificationPayload.userId = new Types.ObjectId(payload.userId)
    }

    const notification = await Notification.create(notificationPayload)

    if (payload.propertyId) {
      EventService.emitToProperty(
        payload.propertyId,
        'dashboard_notification',
        notification,
      )
    }

    return notification
  }

  /*
   ********************************
   * MARK READ
   ********************************
   */
  static async markRead(notificationId: string) {
    return Notification.findByIdAndUpdate(
      notificationId,
      {
        status: 'read',

        readAt: new Date(),
      },
      {
        new: true,
      },
    )
  }

  /*
   ********************************
   * DISMISS
   ********************************
   */
  static async dismiss(notificationId: string) {
    return Notification.findByIdAndUpdate(
      notificationId,
      {
        dismissed: true,
      },
      {
        new: true,
      },
    )
  }

  /*
   ********************************
   * GET PROPERTY NOTIFICATIONS
   ********************************
   */
  static async getPropertyNotifications(propertyId: string) {
    return Notification.find({
      propertyId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(100)
      .lean()
  }

  /*
   ********************************
   * GET ACCOUNT NOTIFICATIONS
   ********************************
   */
  static async getAccountNotifications(accountId: string) {
    return Notification.find({
      accountId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(100)
      .lean()
  }

  /*
   ********************************
   * GET UNREAD COUNT
   ********************************
   */
  static async getUnreadCount(accountId: string) {
    return Notification.countDocuments({
      accountId,
      status: 'unread',
    })
  }

  /*
   ********************************
   * DELETE EXPIRED
   ********************************
   */
  static async cleanupExpired() {
    return Notification.deleteMany({
      expiresAt: {
        $lte: new Date(),
      },
    })
  }

  /*
   ********************************
   * VISITOR ALERT
   ********************************
   */
  static async visitorAlert(
    accountId: string,
    propertyId: string,
    sessionId: string,
    message: string,
  ) {
    return this.create({
      accountId,

      propertyId,

      title: 'New Visitor Message',

      message,

      type: 'message',

      priority: 'high',

      data: {
        sessionId,
      },
    })
  }

  /*
   ********************************
   * CHAT ASSIGNED
   ********************************
   */
  static async assignmentAlert(
    accountId: string,
    propertyId: string,
    sessionId: string,
    operatorId: string,
  ) {
    return this.create({
      accountId,

      propertyId,

      title: 'Chat Assigned',

      message: 'A new chat has been assigned.',

      type: 'assignment',

      priority: 'normal',

      data: {
        sessionId,
        operatorId,
      },
    })
  }

  /*
   ********************************
   * QUEUE ALERT
   ********************************
   */
  static async queueAlert(
    accountId: string,
    propertyId: string,
    queueLength: number,
  ) {
    return this.create({
      accountId,

      propertyId,

      title: 'Queue Alert',

      message: `Queue length: ${queueLength}`,

      type: 'queue',

      priority: 'high',

      data: {
        queueLength,
      },
    })
  }

  /*
   ********************************
   * SECURITY ALERT
   ********************************
   */
  static async securityAlert(accountId: string, message: string) {
    return this.create({
      accountId,

      title: 'Security Alert',

      message,

      type: 'security',

      priority: 'urgent',
    })
  }

  /*
   ********************************
   * SYSTEM ALERT
   ********************************
   */
  static async systemAlert(accountId: string, message: string) {
    return this.create({
      accountId,

      title: 'System Notification',

      message,

      type: 'system',

      priority: 'normal',
    })
  }
}
