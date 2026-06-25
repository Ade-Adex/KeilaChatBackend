// /src/routes/auth.routes.ts

import { Router } from 'express'
import {
  registerTenant,
  loginOperator,
  logoutOperator,
  refreshToken,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js'

import { inviteOperator } from '../controllers/operator.controller.js'

const router = Router()

// Authentication
router.post('/register', registerTenant)
router.post('/login', loginOperator)
router.post('/refresh', refreshToken)
router.post('/logout', logoutOperator)

// Password Recovery
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// Operator Invitation
router.post('/invite', inviteOperator)

export default router
