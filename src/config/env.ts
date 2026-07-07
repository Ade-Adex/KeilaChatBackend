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

// Custom validation for the 32-byte (64 hex characters) crypto secret key
const getCryptoSecret = (): string => {
  const value = getRequiredEnv('SERVER_CRYPTO_SECRET')
  if (value.length !== 64) {
    throw new Error(
      'FATAL ERROR: SERVER_CRYPTO_SECRET must be an exact 64-character hexadecimal string.',
    )
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

  CLOUDINARY: {
    CLOUD_NAME: getRequiredEnv('CLOUDINARY_CLOUD_NAME'),
    API_KEY: getRequiredEnv('CLOUDINARY_API_KEY'),
    API_SECRET: getRequiredEnv('CLOUDINARY_API_SECRET'),
  },

  // 🔒 SERVER SIDE SECURITY AT REST SECRET MATRIX
  CRYPTO: {
    SECRET_HEX: getCryptoSecret(),
  },

  BASE_URL: process.env.BASE_URL,
}
