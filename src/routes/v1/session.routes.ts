// /src/routes/v1/session.routes.ts

import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'

import {
  getSession,
  activeSessions,
  queuedSessions,
  operatorSessions,
  propertySessions,
  initiateSession,
  closeSession,
} from '../../controllers/session.controller.js'

const router = Router()

router.post('/initiate', initiateSession)

router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/active', activeSessions)

router.get('/queued', queuedSessions)


router.get('/operator/:operatorId', operatorSessions)

router.get('/property/:propertyId', propertySessions)

router.get('/:sessionId', getSession)

router.patch('/:sessionId/close', closeSession)

export default router
