// /src/controllers/auth.controller.ts

import type { Request, Response } from 'express'
import { AuthService } from '../services/auth.service.js'
import { generateTokenPair } from '../utils/auth/tokens.js'
import { verifyJwt } from '../utils/auth/jwt.js'
import { SessionService } from '../services/auth-session.service.js'
import Operator from '../models/Operator.js'

/**
 * HELPER: set auth cookies
 */
function setAuthCookies(res: Response, tokens: any, rememberMe = false) {
  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  })

  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
  })
}

/**
 * REGISTER TENANT (Account owner)
 */
export const registerTenant = async (req: Request, res: Response) => {
  const { name, email, password } = req.body

  const result = await AuthService.registerTenant({
    name,
    email,
    password,
  })

  // 🔐 SET COOKIES HERE
  setAuthCookies(res, result.tokens)

  return res.status(201).json({
    success: true,
    data: {
      account: result.account,
      operator: result.operator,
    },
  })
}

/**
 * LOGIN OPERATOR
 */
export const loginOperator = async (req: Request, res: Response) => {
  const { email, password, rememberMe = false } = req.body

  const result = await AuthService.loginOperator({
    email,
    password,
    rememberMe,
  })

  const { operator, account, tokens } = result

  const decoded = verifyJwt(tokens.refreshToken)

  if (decoded.type === 'refresh') {
    await SessionService.storeSession(decoded.jti!, {
      userId: operator._id.toString(),
      accountId: account._id.toString(),
      role: operator.role,
    })
  }

  setAuthCookies(res, tokens, rememberMe)

  return res.status(200).json({
    success: true,
    data: {
      account,
      operator,
    },
  })
}

/**
 * FORGOT PASSWORD
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      })
    }

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`

    await AuthService.forgotPassword(email, origin)

    return res.status(200).json({
      success: true,
      message:
        'If an account exists with that email, a password reset link has been sent.',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to process password reset request',
    })
  }
}

/**
 * RESET PASSWORD
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required',
      })
    }

    await AuthService.resetPassword(token, password)

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : 'Unable to reset password',
    })
  }
}


/**
 * REFRESH TOKEN (ROTATION SYSTEM)
 */
export const refreshToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token

  if (!refreshToken) {
    return res.status(401).json({
      message: 'Refresh token missing',
    })
  }

  const decoded = verifyJwt(refreshToken)

  if (decoded.type !== 'refresh' || !decoded.userId) {
    return res.status(403).json({ message: 'Invalid refresh token' })
  }

  const session = await SessionService.getSession(decoded.jti!)

  if (!session) {
    return res.status(403).json({ message: 'Session expired or invalid' })
  }

  const operator = await Operator.findById(decoded.userId)

  if (!operator) {
    return res.status(404).json({ message: 'User not found' })
  }

  const newTokens = generateTokenPair({
    userId: operator._id.toString(),
    accountId: operator.accountId.toString(),
    role: operator.role,
  })

  await SessionService.deleteSession(decoded.jti!)

  const newDecoded = verifyJwt(newTokens.refreshToken)

  if (newDecoded.type === 'refresh') {
    await SessionService.storeSession(newDecoded.jti!, {
      userId: operator._id.toString(),
      accountId: operator.accountId.toString(),
      role: operator.role,
    })
  }

  // 🔐 UPDATE COOKIES
  setAuthCookies(res, newTokens)

  return res.status(200).json({
    success: true,
    data: {
      message: 'Token refreshed',
    },
  })
}

/**
 * LOGOUT
 */
export const logoutOperator = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token

    if (refreshToken) {
      const decoded = verifyJwt(refreshToken)

      if (decoded.type === 'refresh' && decoded.jti) {
        await SessionService.deleteSession(decoded.jti)
      }
    }

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    })
  }
}