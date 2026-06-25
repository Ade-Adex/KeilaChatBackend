// /src/routes/v1/property.routes.ts

import { Router } from 'express'

import {
  getPropertyDetails,
  getWebsiteSettings,
  updateWebsiteSettings,
} from '../../controllers/property.controller.js'

import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'
import { rbac } from '../../middleware/rbac.middleware.js'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/settings', rbac('admin'), getWebsiteSettings)

router.put('/settings', rbac('admin'), updateWebsiteSettings)

router.get('/:propertyId', getPropertyDetails)

export default router