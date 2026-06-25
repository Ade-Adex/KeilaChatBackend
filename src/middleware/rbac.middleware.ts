// /src/middleware/rbac.middleware.ts

import type { Response, NextFunction } from 'express'
import type { AuthRequest } from './auth.middleware.js'

export const rbac = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role

      if (!userRole) {
        return res.status(403).json({ message: 'Forbidden: No role found' })
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          message: 'Forbidden: Insufficient permissions',
        })
      }

      next()
    } catch {
      return res.status(403).json({ message: 'Access denied' })
    }
  }
}