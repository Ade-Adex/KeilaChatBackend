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

router.use(authMiddleware)

/* -------------------------------- */
/* Messages                         */
/* -------------------------------- */

router.post('/', createMessage)

router.get(
  '/session/:sessionId',
  getMessages,
)

router.patch(
  '/:messageId/delivered',
  deliveredMessage,
)

router.patch(
  '/:messageId/read',
  readMessage,
)

export default router