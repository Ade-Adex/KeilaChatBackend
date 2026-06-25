// /src/utils/auth/jwt.ts

import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { ENV } from '../../config/env.js'

export interface JwtPayload {
  userId: string
  accountId?: string
  role?: string
  type: 'access' | 'refresh'
  jti?: string
}

export const signJwt = (
  payload: JwtPayload,
  expiresIn: SignOptions['expiresIn'],
): string => {
  return jwt.sign(payload, ENV.JWT.SECRET, {
    expiresIn,
  } as SignOptions)
}

export const verifyJwt = (token: string): JwtPayload => {
  return jwt.verify(token, ENV.JWT.SECRET) as JwtPayload
}