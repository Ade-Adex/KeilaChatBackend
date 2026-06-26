// /src/routes/v1/widget.routes.ts

import { Router } from 'express'

import {
  initializeWidget,
  verifyWidget,
  widgetStatus,
  getWidgetSettings,
} from '../../controllers/widget.controller.js'

const router = Router()

/* -------------------------------- */
/* Widget                           */
/* -------------------------------- */

router.post(
  '/initialize',
  initializeWidget,
)

router.get(
  '/:widgetId/verify',
  verifyWidget,
)

router.get(
  '/:widgetId/status',
  widgetStatus,
)

router.get(
  '/:widgetId/settings',
  getWidgetSettings,
)

export default router