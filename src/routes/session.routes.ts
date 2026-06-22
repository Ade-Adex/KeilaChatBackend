// /src/routes/session.routes.ts

import { Router } from 'express'
import {
  initiateSession,
  getPropertySessions,
  endSession,
} from '../controllers/session.controller.js'
import { getSessionMessages, sendOperatorMessage } from '../controllers/message.controller.js'

const router = Router()

router.post('/initiate', initiateSession)
router.get('/property/:propertyId', getPropertySessions)

// 2. Add this route explicitly to process incoming operator text dispatches
router.post('/:sessionId/messages', sendOperatorMessage) 
router.get('/:sessionId/messages', getSessionMessages)

router.patch('/:sessionId/end', endSession)

export default router