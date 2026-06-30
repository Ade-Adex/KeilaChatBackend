// /src/routes/v1/visitor.routes.ts

import { Router } from 'express'
import { updateVisitorProfile } from '../../controllers/visitor.controller.js'

const router = Router()

// PATCH /api/v1/visitors/profile
router.patch('/profile', updateVisitorProfile)

export default router