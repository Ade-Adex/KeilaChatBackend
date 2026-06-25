// /src/routes/v1/widget.routes.ts

import { Router } from 'express'

import {
  initializeWidget,
  verifyWidget,
} from '../../controllers/widget.controller.js'

const router = Router()

router.post('/init', initializeWidget)

router.post('/verify', verifyWidget)

// Future
// router.post('/heartbeat', widgetHeartbeat)

// router.post('/config', widgetConfig)

export default router
