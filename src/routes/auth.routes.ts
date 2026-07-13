// /src/routes/auth.routes.ts

import { Router } from 'express'
import {
  registerTenant,
  loginOperator,
  logoutOperator,
  refreshToken,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/auth.controller.js'

import { inviteOperator } from '../controllers/operator.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js' 

const router = Router()

// Authentication
router.post('/register', registerTenant)
router.post('/login', loginOperator)
router.post('/refresh', refreshToken)
router.post('/logout', logoutOperator)

// Profile Context Hydration
router.get('/me', authMiddleware, getMe)

// Password Recovery
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// Operator Invitation
router.post('/invite', inviteOperator)

export default router