import { Redis } from 'ioredis'

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  console.warn('⚠️ WARNING: REDIS_URL not specified in environment variables.')
}

// Named import makes Redis perfectly constructable here
const redisClient = new Redis(redisUrl || 'redis://127.0.0.1:6379')

redisClient.on('connect', () => {
  console.log('⚡ Redis In-Memory Cache Connected')
})

redisClient.on('error', (err: unknown) => {
  if (err instanceof Error) {
    console.error('❌ Redis Connection Error:', err.message)
  } else {
    console.error(
      '❌ Redis Connection Error: An unexpected error occurred',
      err,
    )
  }
})

export default redisClient
