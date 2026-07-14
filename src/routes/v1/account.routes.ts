// /src/routes/v1/account.routes.ts

import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'

import {
  // getWorkspace,
  updateWorkspace,
} from '../../controllers/account.controller.js'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

// router.get('/workspace', getWorkspace)
router.put('/workspace', updateWorkspace)

export default router