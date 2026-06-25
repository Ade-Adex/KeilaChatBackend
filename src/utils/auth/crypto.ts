// /src/utils/auth/crypto.ts

import crypto from 'crypto'

export const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

export const generateApiKey = (): string => {
  return crypto.randomBytes(40).toString('hex')
}