// /src/routes/widget.routes.ts

import { Router } from 'express'
import { initializeWidget, verifyWidget } from '../controllers/widget.controller.js'

const router = Router()

// POST pipeline used here to securely accommodate trace strings
router.post('/init', initializeWidget)

// New Verification Endpoint
router.post('/verify', verifyWidget)

export default router