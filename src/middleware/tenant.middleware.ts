// /src/middleware/tenant.middleware.ts

import type { Response, NextFunction } from 'express'
import type { AuthRequest } from './auth.middleware.js'

export const tenantMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const accountIdFromToken = req.user?.accountId

    if (!accountIdFromToken) {
      return res.status(403).json({
        message: 'Forbidden: Missing tenant context',
      })
    }

    // attach tenant to request
    req.headers['x-account-id'] = accountIdFromToken

    next()
  } catch {
    return res.status(403).json({ message: 'Tenant validation failed' })
  }
}