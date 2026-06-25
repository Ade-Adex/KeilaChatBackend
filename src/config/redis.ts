// /src/config/redis.ts

import { Redis } from 'ioredis'
import logger from '../bootstrap/logger.js'

const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  logger.warn('REDIS_URL not specified. Falling back to localhost.')
}

const redisClient = new Redis(redisUrl || 'redis://127.0.0.1:6379')

// Connection success
redisClient.on('connect', () => {
  logger.info('⚡ Redis In-Memory Cache Connected')
})

// Ready event (more reliable than connect)
redisClient.on('ready', () => {
  logger.info('🚀 Redis Client Ready')
})

// Error handling
redisClient.on('error', (err: unknown) => {
  if (err instanceof Error) {
    logger.error(`❌ Redis Connection Error: ${err.message}`)
  } else {
    logger.error('❌ Redis Connection Error: Unknown error', err as any)
  }
})

// Optional: reconnect tracking
redisClient.on('reconnecting', (time: number) => {
  logger.warn(`🔁 Redis reconnecting in ${time}ms`)
})

export default redisClient
