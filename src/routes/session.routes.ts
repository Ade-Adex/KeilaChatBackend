// /src/routes/session.routes.ts

import { Router } from 'express'
import {
  initiateSession,
  getPropertySessions,
} from '../controllers/session.controller.js'
import { getSessionMessages } from '../controllers/message.controller.js'

const router = Router()

router.post('/initiate', initiateSession)
router.get('/property/:propertyId', getPropertySessions)

router.get('/:sessionId/messages', getSessionMessages)

export default router