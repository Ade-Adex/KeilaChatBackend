// /src/routes/widget.routes.ts

import { Router } from 'express'
import { initializeWidget } from '../controllers/widget.controller.js'

const router = Router()

// POST pipeline used here to securely accommodate trace strings and tracking tokens without URL leaks
router.post('/init', initializeWidget)

export default router