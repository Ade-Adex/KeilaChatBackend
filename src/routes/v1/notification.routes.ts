// /src/routes/v1/notification.routes.ts
import { Router } from 'express'

import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  dismissNotification,
} from '../../controllers/notification.controller.js'

import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/', getNotifications)

router.get('/unread', getUnreadCount)

router.patch('/:notificationId/read', markNotificationRead)

router.patch('/:notificationId/dismiss', dismissNotification)

export default router