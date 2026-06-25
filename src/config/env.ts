// /src/config/env.ts
import dotenv from 'dotenv'
import type { SignOptions } from 'jsonwebtoken'

// Load environment variables from .env file
dotenv.config()

// Helper to ensure critical variables are present
const getRequiredEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`FATAL ERROR: Environment variable ${key} is missing.`)
  }
  return value
}


export const ENV = {
  PORT: process.env.PORT || '5000',
  MONGO_URI: getRequiredEnv('MONGO_URI'),
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  NODE_ENV: process.env.NODE_ENV || 'development',

  JWT: {
    SECRET: getRequiredEnv('JWT_SECRET'),
    EXPIRES_IN: (process.env.JWT_EXPIRES_IN ||
      '7d') as SignOptions['expiresIn'],
  },

  RESEND: {
    API_KEY: process.env.RESEND_API_KEY,
    MAIL_USER:
      process.env.RESEND_MAIL_USER || 'no-reply@mail.christbcogbomoso.org',
  },

  BASE_URL: process.env.BASE_URL,
}