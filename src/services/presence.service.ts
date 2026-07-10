// /src/services/presence.service.ts

import redisClient from '../config/redis.js'
import Operator from '../models/Operator.js'

export class PresenceService {
  static async setOperatorOnline(operatorId: string, socketId: string) {
    await redisClient.hset(`operator:${operatorId}`, {
      status: 'online',
      socketId,
      lastSeen: String(Date.now()), // Ensure string compatibility
    })

    // 🎯 Set a sliding 5-minute key expiry so Redis can auto-expire dead connections
    await redisClient.expire(`operator:${operatorId}`, 300)
  }

  static async setOperatorOffline(operatorId: string) {
    await redisClient.hset(`operator:${operatorId}`, {
      status: 'offline',
      socketId: '',
      lastSeen: String(Date.now()),
    })
  }

  static async isOperatorOnline(operatorId: string) {
    const status = await redisClient.hget(`operator:${operatorId}`, 'status')
    return status === 'online'
  }

  static async setOperatorAway(operatorId: string) {
    await redisClient.hset(`operator:${operatorId}`, {
      status: 'away',
      lastSeen: String(Date.now()),
    })
  }

  static async getOperatorStatus(operatorId: string) {
    return redisClient.hgetall(`operator:${operatorId}`)
  }

  static async getOperatorSocket(operatorId: string) {
    return redisClient.hget(`operator:${operatorId}`, 'socketId')
  }

  // 🎯 REFACTORED HEARTBEAT METHOD
  static async recordHeartbeat(operatorId: string) {
    let currentStatus = await redisClient.hget(
      `operator:${operatorId}`,
      'status',
    )

    // If there's no status, or they were swept offline by the server, revive them!
    if (!currentStatus || currentStatus === 'offline') {
      currentStatus = 'online'

      // Sync restoration directly back to MongoDB
      await Operator.updateOne(
        { _id: operatorId },
        { $set: { isOnline: true, availabilityStatus: 'online' } },
      )
    }

    await redisClient.hset(`operator:${operatorId}`, {
      status: currentStatus,
      lastSeen: String(Date.now()),
    })
    await redisClient.expire(`operator:${operatorId}`, 300)
  }
  static async setVisitorActive(visitorId: string, sessionId: string) {
    await redisClient.set(`visitor:session:${visitorId}`, sessionId)
  }

  static async getVisitorSession(visitorId: string) {
    return await redisClient.get(`visitor:session:${visitorId}`)
  }

  static async removeVisitor(visitorId: string) {
    await redisClient.del(`visitor:session:${visitorId}`)
  }
}
