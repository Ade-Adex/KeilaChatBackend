// /src/routes/v1/dashboard.routes.ts

import { Router } from 'express'

import {
  getOverview,
  getQueue,
  getActiveChats,
} from '../../controllers/dashboard.controller.js'

const router = Router()

router.get('/:propertyId/overview', getOverview)

router.get('/:propertyId/queue', getQueue)

router.get('/:propertyId/active-chats', getActiveChats)

export default router