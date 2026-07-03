// /src/routes/v1/ai.routes.ts
import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'
import { toggleSessionAI } from '../../controllers/ai.controller.js'

const router = Router()

// Apply security context layers globally across the AI routes scope
router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * 🎯 Route definitions
 */
router.patch('/session/:sessionId/toggle', toggleSessionAI)

export default router
