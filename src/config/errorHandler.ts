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

  // Check if it is our custom operational error
  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
  } else if (err instanceof Error) {
    // This catches unexpected native Javascript/Node runtime exceptions
    message = err.message
  }

  // Development vs Production response layout
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      status: 'error',
      message,
      stack: err instanceof Error ? err.stack : undefined,
      error: err,
    })
  } else {
    // Production: Don't leak system logs or developer stacks to clients
    res.status(statusCode).json({
      status: 'error',
      message:
        statusCode === 500 ? 'Something went wrong on our end.' : message,
    })
  }
}

// Async utility using clean type-only parameters to satisfy verbatimModuleSyntax
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch((err: unknown) => next(err))
  }
}
