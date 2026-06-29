// /src/services/auth-session.service.ts


import redisClient from '../config/redis.js'

const PREFIX = 'refresh_session:'

export class SessionService {
  static async storeSession(
    sessionId: string,
    data: object,
    ttlSeconds = 7 * 24 * 60 * 60,
  ) {
    await redisClient.set(
      `${PREFIX}${sessionId}`,
      JSON.stringify(data),
      'EX',
      ttlSeconds,
    )
  }

  static async getSession(sessionId: string) {
    const data = await redisClient.get(`${PREFIX}${sessionId}`)
    if (!data) return null

    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  static async deleteSession(sessionId: string) {
    await redisClient.del(`${PREFIX}${sessionId}`)
  }
}