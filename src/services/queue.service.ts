// /src/services/queue.service.ts


// You'll need this for: No operator available, Place visitor in queue, Position #3, Operator becomes free, Assign next visitor


import redisClient from '../config/redis.js'

export class QueueService {
  static async addToQueue(propertyId: string, sessionId: string) {
    const queue = await redisClient.lrange(`queue:${propertyId}`, 0, -1)

    if (!queue.includes(sessionId)) {
      await redisClient.rpush(`queue:${propertyId}`, sessionId)
    }

    await redisClient.set(
      `queue:timestamp:${sessionId}`,
      String(Date.now()),
      'EX',
      900,
    )
  }

  static async getNext(propertyId: string) {
    return await redisClient.lpop(`queue:${propertyId}`)
  }

  static async getQueueLength(propertyId: string) {
    return await redisClient.llen(`queue:${propertyId}`)
  }

  static async getPosition(propertyId: string, sessionId: string) {
    const queue = await redisClient.lrange(`queue:${propertyId}`, 0, -1)

    return queue.indexOf(sessionId) + 1
  }

  static async removeFromQueue(propertyId: string, sessionId: string) {
    await redisClient.lrem(`queue:${propertyId}`, 0, sessionId)
  }
}

