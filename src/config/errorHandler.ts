// /src/config/errorHandler.ts

import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../services/appError.js'

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let statusCode = 500
  let message = 'Internal Server Error'

  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
  } else if (err instanceof Error) {
    message = err.message
  }

  // VERY IMPORTANT
  console.error('\n========== API ERROR ==========')
  console.error('URL:', req.originalUrl)
  console.error('METHOD:', req.method)
  console.error('BODY:', req.body)
  console.error('PARAMS:', req.params)
  console.error('QUERY:', req.query)
  console.error('ERROR:', err)
  console.error('===============================\n')

  res.status(statusCode).json({
    status: 'error',
    message,
    stack: err instanceof Error ? err.stack : undefined,
    error:
      err instanceof Error
        ? {
            name: err.name,
            message: err.message,
          }
        : err,
  })
}

export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch((err: unknown) => next(err))
  }
}
