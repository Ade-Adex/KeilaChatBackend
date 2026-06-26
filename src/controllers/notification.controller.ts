// /src/controllers/notification.controller.ts

import type { Request, Response } from 'express'

import { NotificationService } from '../services/notification.service.js'

/* -------------------------------- */
/* Get Notifications                */
/* -------------------------------- */

export const getNotifications = async (req: Request, res: Response) => {
  const accountId = String(req.params.accountId)

  const notifications =
    await NotificationService.getAccountNotifications(accountId)

  return res.status(200).json({
    success: true,
    data: notifications,
  })
}

/* -------------------------------- */
/* Get Unread Count                 */
/* -------------------------------- */

export const getUnreadCount = async (req: Request, res: Response) => {
  const accountId = String(req.params.accountId)

  const count = await NotificationService.getUnreadCount(accountId)

  return res.status(200).json({
    success: true,
    data: {
      unread: count,
    },
  })
}

/* -------------------------------- */
/* Mark Notification Read           */
/* -------------------------------- */

export const markNotificationRead = async (req: Request, res: Response) => {
  const notificationId = String(req.params.notificationId)

  const notification = await NotificationService.markRead(notificationId)

  return res.status(200).json({
    success: true,
    data: notification,
  })
}

/* -------------------------------- */
/* Dismiss Notification             */
/* -------------------------------- */

export const dismissNotification = async (req: Request, res: Response) => {
  const notificationId = String(req.params.notificationId)

  const notification = await NotificationService.dismiss(notificationId)

  return res.status(200).json({
    success: true,
    data: notification,
  })
}
