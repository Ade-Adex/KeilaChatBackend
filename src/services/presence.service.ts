// /src/services/presence.service.ts



//  You'll use this for: online badge, away badge, last seen, operator availability, visitor online/offline, "John is typing", "John joined"

import redisClient from '../config/redis.js'

export class PresenceService {
  static async setOperatorOnline(operatorId: string, socketId: string) {
    await redisClient.set(`operator:socket:${operatorId}`, socketId)
    await redisClient.set(`operator:online:${operatorId}`, 'true')
  }

  static async setOperatorOffline(operatorId: string) {
    await redisClient.del(`operator:socket:${operatorId}`)
    await redisClient.set(`operator:online:${operatorId}`, 'false')
  }

  static async isOperatorOnline(operatorId: string) {
    const status = await redisClient.get(`operator:online:${operatorId}`)
    return status === 'true'
  }

  static async getOperatorSocket(operatorId: string) {
    return redisClient.get(`operator:socket:${operatorId}`)
  }

  static async setVisitorActive(visitorId: string, sessionId: string) {
    await redisClient.set(`visitor:session:${visitorId}`, sessionId)
  }

  static async getVisitorSession(visitorId: string) {
    return await redisClient.get(`visitor:session:${visitorId}`)
  }
}