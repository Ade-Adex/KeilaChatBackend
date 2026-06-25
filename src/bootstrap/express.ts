//  /src/bootstrap/express.ts

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import appRouter from '../routes/index.js'
import { globalErrorHandler } from '../config/errorHandler.js'
import { ENV } from '../config/env.js'

export const bootstrapExpress = () => {
  const app = express()

  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    }),
  )

  app.options('*', cors())
  
  app.use(cookieParser())
  app.use(express.json())

  // IMPORTANT: if behind proxy (Render, Railway, Nginx, etc.)
  app.set('trust proxy', 1)

  app.use('/api/v1', appRouter)

  app.use(globalErrorHandler)

  return app
}