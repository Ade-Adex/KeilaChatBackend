//  /src/bootstrap/redis.ts

import redisClient from '../config/redis.js'

export const bootstrapRedis = async (): Promise<void> => {
  await redisClient.ping()

  console.log('\x1b[32m%s\x1b[0m', '✅ Redis bootstrap completed.')
}