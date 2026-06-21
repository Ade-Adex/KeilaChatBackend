import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import widgetRouter from './widget.routes.js'
import authRouter from './auth.routes.js'
import sessionRouter from './session.routes.js'
import propertyRouter from './property.routes.js'

const router = Router()

// Base System Health Check
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Modern TS Chat server is active!',
  })
})

// Central Testing Route for Central Error Handlers
router.get(
  '/test-error',
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    throw new AppError(
      'This is a test 400 Bad Request error captured safely!',
      400,
    )
  }),
)

router.use('/auth', authRouter)
router.use('/widget', widgetRouter)
router.use('/sessions', sessionRouter)
router.use('/properties', propertyRouter)

export default router
