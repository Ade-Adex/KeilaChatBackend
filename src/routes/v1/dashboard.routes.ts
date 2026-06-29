// /src/routes/v1/dashboard.routes.ts

import { Router } from 'express'

import {
  getOverview,
  getQueue,
  getActiveChats,
} from '../../controllers/dashboard.controller.js'

import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/:propertyId/overview', getOverview)

router.get('/:propertyId/queue', getQueue)

router.get('/:propertyId/active-chats', getActiveChats)

export default router