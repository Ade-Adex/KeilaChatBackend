//  /src/bootstrap/express.ts

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import appRouter from '../routes/index.js'
import { globalErrorHandler } from '../config/errorHandler.js'
import { ENV } from '../config/env.js'

export const bootstrapExpress = () => {
  const app = express()

  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ENV.BASE_URL, // 👈 production frontend URL
  ].filter(Boolean) as string[]

  app.use(
    cors({
      origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true)

        if (allowedOrigins.includes(origin)) {
          return callback(null, true)
        }

        return callback(new Error('Not allowed by CORS'), false)
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
    }),
  )

  app.use(cookieParser())
  app.use(express.json())

  // IMPORTANT: if behind proxy (Render, Railway, Nginx, etc.)
  app.set('trust proxy', 1)

  app.use('/api/v1', appRouter)

  app.use(globalErrorHandler)

  return app
}