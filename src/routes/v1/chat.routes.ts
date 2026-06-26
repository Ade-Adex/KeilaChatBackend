// /src/routes/v1//chat.routes.ts

import { Router } from 'express'

import {
  createChat,
  endChat,
  assignOperator,
  joinChat,
  leaveChat,
  transferSession,
  typingStatus,
  submitRating,
  createInternalNote,
} from '../../controllers/chat.controller.js'

import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'
import { rbac } from '../../middleware/rbac.middleware.js'

const router = Router()

/* -------------------------------- */
/* Chat                             */
/* -------------------------------- */

router.post('/', createChat)

router.use(authMiddleware)
router.use(tenantMiddleware)

router.patch('/:sessionId/close', endChat)

router.patch('/:sessionId/assign', assignOperator)

router.patch('/:sessionId/join', joinChat)

router.patch('/:sessionId/leave', leaveChat)

router.patch('/:sessionId/transfer', transferSession)

router.patch('/:sessionId/typing', typingStatus)

router.post('/:sessionId/rating', submitRating)

router.post('/:sessionId/internal-note', createInternalNote)

export default router
