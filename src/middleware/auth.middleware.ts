// /src/middleware/auth.middleware.ts

import type { Request, Response, NextFunction } from 'express'
import { verifyJwt } from '../utils/auth/jwt.js'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    accountId?: string
    role?: string
    type: 'access' | 'refresh'
  }
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Try Authorization header first
    const bearerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : undefined

    // 2. Otherwise use the cookie
    const cookieToken = req.cookies?.access_token

    const token = bearerToken || cookieToken

    if (!token) {
      return res.status(401).json({
        message: 'Unauthorized: No token provided',
      })
    }

    const decoded = verifyJwt(token)

    if (!decoded || decoded.type !== 'access') {
      return res.status(401).json({
        message: 'Invalid or expired token',
      })
    }

    req.user = decoded

    next()
  } catch {
    return res.status(401).json({
      message: 'Authentication failed',
    })
  }
}
