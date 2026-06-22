// /src/routes/auth.routes.ts

import { Router } from 'express'
import { loginOperator, logoutOperator, registerInvitedOperator, registerTenant } from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', registerTenant)
router.post('/register-operator', registerInvitedOperator)
router.post('/login', loginOperator)
router.post('/logout', logoutOperator)

export default router