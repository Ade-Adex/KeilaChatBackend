// /src/services/notification.service.ts

import Notification from '../models/Notification.js'
import { EventService } from './event.service.js'
import logger from '../bootstrap/logger.js'
import type {
  NotificationType,
  NotificationPriority,
} from '../types/notification.types.js'

export class NotificationService {
  static async createNotification(data: {
    accountId: string
    propertyId?: string
    userId?: string
    title: string
    message: string
    type: NotificationType
    priority?: NotificationPriority
    data?: Record<string, any>
  }) {
    try {
      const notification = await Notification.create({
        ...data,
        status: 'unread',
      })

      // 🔥 REAL-TIME PUSH
      if (data.propertyId) {
        EventService.emitToProperty(
          data.propertyId,
          'new_notification',
          notification,
        )
      }

      logger.info(`📢 Notification created: ${data.title}`)

      return notification
    } catch (error) {
      logger.error(error, 'Notification creation failed')
      throw error
    }
  }

  static async markAsRead(notificationId: string) {
    return Notification.findByIdAndUpdate(notificationId, {
      status: 'read',
      readAt: new Date(),
    })
  }

  static async getUnread(accountId: string) {
    return Notification.find({
      accountId,
      status: 'unread',
    }).sort({ createdAt: -1 })
  }

  static async getAll(accountId: string) {
    return Notification.find({ accountId }).sort({ createdAt: -1 })
  }
}
