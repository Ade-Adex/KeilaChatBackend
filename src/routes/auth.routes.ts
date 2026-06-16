// /src/routes/auth.routes.ts

import { Router } from 'express'
import { loginOperator, registerTenant } from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', registerTenant)
router.post('/login', loginOperator)

export default router