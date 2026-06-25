// /src/bootstrap/gracefulShutdown.ts


// /src/bootstrap/gracefulShutdown.ts

import mongoose from 'mongoose'
import type { Server as HTTPServer } from 'http'

import redisClient from '../config/redis.js'
import logger from './logger.js'

export function registerGracefulShutdown(
  server: HTTPServer,
): void {
  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal}. Starting graceful shutdown...`)

    try {
      server.close(() => {
        logger.info('HTTP Server closed.')
      })

      await mongoose.connection.close()

      logger.info('MongoDB disconnected.')

      await redisClient.quit()

      logger.info('Redis disconnected.')

      process.exit(0)
    } catch (error) {
      logger.error(error)

      process.exit(1)
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('SIGTERM', () => shutdown('SIGTERM'))
}