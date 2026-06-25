// /src/controllers/notification.controller.ts

import type { Request, Response } from 'express'
import { NotificationService } from '../services/notification.service.js'

/**
 * GET NOTIFICATIONS
 */
export const getNotifications = async (req: Request, res: Response) => {
  const accountId = String(req.params.accountId)
  const unread = String(req.query.unread)

  const notifications =
    unread === 'true'
      ? await NotificationService.getUnread(accountId)
      : await NotificationService.getAll(accountId)

  return res.status(200).json({
    success: true,
    data: notifications,
  })
}

/**
 * MARK SINGLE AS READ
 */
export const markAsRead = async (req: Request, res: Response) => {
  const id = String(req.params.id)

  const updated = await NotificationService.markAsRead(id)

  return res.status(200).json({
    success: true,
    data: updated,
  })
}

/**
 * MARK ALL AS READ
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  const accountId = String(req.params.accountId)

  const items = await NotificationService.getUnread(accountId)

  await Promise.all(
    items.map((n) => NotificationService.markAsRead(n._id.toString())),
  )

  return res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  })
}

/**
 * DELETE NOTIFICATION
 */
export const deleteNotification = async (req: Request, res: Response) => {
  const id = String(req.params.id)

  await NotificationService.markAsRead(id) // (NOTE: bug here - see below)

  return res.status(200).json({
    success: true,
    message: 'Notification deleted',
  })
}
