// /src/routes/v1/knowledgeBase.routes.ts

import { Router } from 'express'
import {
  getSettings,
  updateSettings,
  testPlayground,
  crawlPropertyUrls,
  deleteCrawledSource,
} from '../../controllers/knowledgeBase.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'
import { rbac } from '../../middleware/rbac.middleware.js'
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware.js'

const router = Router()

/* -------------------------------------------------------------------------- */
/* GLOBAL MIDDLEWARE LAYER                                                    */
/* -------------------------------------------------------------------------- */
router.use(authMiddleware)
router.use(tenantMiddleware)
router.use(rateLimitMiddleware)

/* -------------------------------------------------------------------------- */
/* KNOWLEDGE BASE ENDPOINTS                                                   */
/* -------------------------------------------------------------------------- */

// Get active knowledge base configurations
router.get('/', rbac('admin'), getSettings)

// Secure modifications to rule thresholds and text datasets
router.post('/', rbac('admin'), updateSettings)

// 🎯 Route handling for the sandbox simulation matching engine
router.post('/test', rbac('admin'), testPlayground)

// (Resolves target workspace context matching your smart auto-lookup controller patterns)
router.post('/crawl', crawlPropertyUrls)
router.delete('/sources/delete', rbac('admin'), deleteCrawledSource)

export default router