// /src/routes/v1/message.routes.ts

import { Router } from 'express'
import { getSessionMessages } from '../../controllers/message.controller.js'

import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/:sessionId', getSessionMessages)

export default router