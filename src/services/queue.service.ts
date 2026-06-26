// /src/services/queue.service.ts


// You'll need this for: No operator available, Place visitor in queue, Position #3, Operator becomes free, Assign next visitor


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
