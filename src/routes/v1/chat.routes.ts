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

const router = Router()

/* -------------------------------- */
/* Chat                             */
/* -------------------------------- */

router.post('/', createChat)

router.patch('/:sessionId/close', endChat)

router.patch('/:sessionId/assign', assignOperator)

router.patch('/:sessionId/join', joinChat)

router.patch('/:sessionId/leave', leaveChat)

router.patch('/:sessionId/transfer', transferSession)

router.patch('/:sessionId/typing', typingStatus)

router.post('/:sessionId/rating', submitRating)

router.post('/:sessionId/internal-note', createInternalNote)

export default router
