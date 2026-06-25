// /src/server.ts

import dotenv from 'dotenv'
dotenv.config()

import http from 'http'

import { bootstrapDatabase } from './bootstrap/database.js'
import { bootstrapRedis } from './bootstrap/redis.js'
import { bootstrapExpress } from './bootstrap/express.js'
import { bootstrapSocket } from './bootstrap/socket.js'
import { bootstrapCron } from './bootstrap/cron.js'
import { registerGracefulShutdown } from './bootstrap/gracefulShutdown.js'

import logger from './bootstrap/logger.js'

const PORT = Number(process.env.PORT) || 5000

async function startServer() {
  await bootstrapDatabase()

  await bootstrapRedis()

  const app = bootstrapExpress()

  const server = http.createServer(app)

  const socketService = bootstrapSocket(server)

  app.set('socketService', socketService)

  bootstrapCron()

  registerGracefulShutdown(server)

  server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`)
  })
}

startServer().catch((error) => {
  logger.error(error)
  process.exit(1)
})
