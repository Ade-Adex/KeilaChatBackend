//  src/middleware/rateLimit.middleware.ts

import type { Request, Response, NextFunction } from 'express'

const ipMap = new Map<string, { count: number; lastReset: number }>()

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 60

export const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip = req.ip || 'unknown'
  const now = Date.now()

  const record = ipMap.get(ip)

  if (!record) {
    ipMap.set(ip, { count: 1, lastReset: now })
    return next()
  }

  if (now - record.lastReset > WINDOW_MS) {
    ipMap.set(ip, { count: 1, lastReset: now })
    return next()
  }

  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({
      message: 'Too many requests. Please slow down.',
    })
  }

  record.count += 1
  next()
}