// /src/routes/v1/message.routes.ts

import { Router } from 'express'
import {
  createMessage,
  getMessages,
  deliveredMessage,
  readMessage,
} from '../../controllers/message.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'

const router = Router()

/* -------------------------------- */
/* Public/Visitor Open Endpoints     */
/* -------------------------------- */
router.get('/session/:sessionId', getMessages)

/* -------------------------------- */
/* Protected Operator Endpoints     */
/* -------------------------------- */
router.use(authMiddleware)

router.post('/', createMessage)

router.patch('/:messageId/delivered', deliveredMessage)

router.patch('/:messageId/read', readMessage)

export default router