// /src/services/queue.service.ts

import redisClient from '../config/redis.js'

export class QueueService {
  static async addToQueue(propertyId: string, sessionId: string) {
    await redisClient.rpush(`queue:${propertyId}`, sessionId)
  }

  static async getNext(propertyId: string) {
    return await redisClient.lpop(`queue:${propertyId}`)
  }

  static async getQueueLength(propertyId: string) {
    return await redisClient.llen(`queue:${propertyId}`)
  }
}
