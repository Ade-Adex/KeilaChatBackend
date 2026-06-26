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
} from '../../controllers/session.controller.js'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

/* -------------------------------- */
/* Session Queries                  */
/* -------------------------------- */

// single session
router.get('/:sessionId', getSession)

// active sessions for property
router.get('/active', activeSessions)

// queued sessions for property
router.get('/queued', queuedSessions)

// sessions assigned to operator
router.get('/operator/:operatorId', operatorSessions)

// all property sessions
router.get('/property/:propertyId', propertySessions)

export default router
