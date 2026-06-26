// /src/routes/v1/notification.routes.ts
import { Router } from 'express'

import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  dismissNotification,
} from '../../controllers/notification.controller.js'

const router = Router()

router.get('/account/:accountId', getNotifications)

router.get('/account/:accountId/unread', getUnreadCount)

router.patch('/:notificationId/read', markNotificationRead)

router.patch('/:notificationId/dismiss', dismissNotification)

export default router