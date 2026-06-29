// /src/services/presence.service.ts



//  You'll use this for: online badge, away badge, last seen, operator availability, visitor online/offline, "John is typing", "John joined"

import redisClient from '../config/redis.js'

export class PresenceService {
  static async setOperatorOnline(operatorId: string, socketId: string) {
    await redisClient.hset(`operator:${operatorId}`, {
      status: 'online',
      socketId,
      lastSeen: Date.now(),
    })
  }

  static async setOperatorOffline(operatorId: string) {
    await redisClient.hset(`operator:${operatorId}`, {
      status: 'offline',
      socketId: '',
      lastSeen: Date.now(),
    })
  }

  static async isOperatorOnline(operatorId: string) {
    const status = await redisClient.hget(`operator:${operatorId}`, 'status')

    return status === 'online'
  }

  static async setOperatorAway(operatorId: string) {
    await redisClient.hset(`operator:${operatorId}`, {
      status: 'away',
      lastSeen: Date.now(),
    })
  }

  static async getOperatorStatus(operatorId: string) {
    return redisClient.hgetall(`operator:${operatorId}`)
  }

  static async getOperatorSocket(operatorId: string) {
    return redisClient.hget(`operator:${operatorId}`, 'socketId')
  }


  static async setVisitorActive(visitorId: string, sessionId: string) {
    await redisClient.set(`visitor:session:${visitorId}`, sessionId)
  }

  static async getVisitorSession(visitorId: string) {
    return await redisClient.get(`visitor:session:${visitorId}`)
  }
}