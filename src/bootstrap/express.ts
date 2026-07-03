// /src/bootstrap/express.ts

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import Property from '../models/Property.js'

import appRouter from '../routes/index.js'
import { globalErrorHandler } from '../config/errorHandler.js'
import { ENV } from '../config/env.js'

export const bootstrapExpress = () => {
  const app = express()

  app.use(
    cors({
      credentials: true,

      origin: async (origin, callback) => {
        try {
          if (!origin) {
            return callback(null, true)
          }

          if (origin === ENV.BASE_URL) {
            return callback(null, true)
          }

          const property = await Property.findOne({
            $or: [{ domain: origin }, { allowedDomains: origin }],
          }).lean()

          if (property) {
            return callback(null, true)
          }

          return callback(new Error('Origin not allowed'))
        } catch (err) {
          return callback(err as Error)
        }
      },

      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    }),
  )

  app.use(cookieParser())
  app.use(express.json())

  app.set('trust proxy', 1)

  app.use('/api/v1', appRouter)

  app.use(globalErrorHandler)

  return app
}
