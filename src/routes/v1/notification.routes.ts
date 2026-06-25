// /src/routes/v1/notification.routes.ts

import { Router } from 'express'


import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'
import { deleteNotification, getNotifications, markAllAsRead, markAsRead } from '../../controllers/notification.controller.js'

const router = Router()

// protect all notification routes
router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * GET ALL / UNREAD
 */
router.get('/:accountId', getNotifications)

/**
 * MARK SINGLE AS READ
 */
router.patch('/:id/read', markAsRead)

/**
 * MARK ALL AS READ
 */
router.patch('/:accountId/read-all', markAllAsRead)

/**
 * DELETE NOTIFICATION
 */
router.delete('/:id', deleteNotification)

export default router