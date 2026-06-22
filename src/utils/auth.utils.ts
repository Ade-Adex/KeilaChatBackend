// /src/utils/auth.utils.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { ENV } from '../config/env.js'

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12)
  return await bcrypt.hash(password, salt)
}

export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

export const generateSecureToken = (payload: object): string => {
  return jwt.sign(payload, ENV.JWT.SECRET, {
    expiresIn: ENV.JWT.EXPIRES_IN as any,
  })
}

// Generates a random, cryptographically secure hex string for invitations
export const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

export const generatePropertyCredentials = () => ({
  widgetId: uuidv4(),
  apiKey: crypto.randomBytes(32).toString('hex'),
})
