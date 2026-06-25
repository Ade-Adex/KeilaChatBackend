// /src/utils/auth/refreshToken.ts

import crypto from 'crypto'

export const generateRefreshTokenId = (): string => {
  return crypto.randomBytes(64).toString('hex')
}