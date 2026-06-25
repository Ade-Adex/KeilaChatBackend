// /src/routes/v1/session.routes.ts

import { Router } from 'express'


import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'
import { endSession, getPropertySessions, initiateSession } from '../../controllers/session.controller.js'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

router.post('/initiate', initiateSession)
router.get('/property/:propertyId', getPropertySessions)
router.patch('/:sessionId/end', endSession)

export default router