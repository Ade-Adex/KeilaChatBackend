// /src/utils/auth/tokens.ts

import { signJwt } from './jwt.js'
import { ENV } from '../../config/env.js'
import { generateRefreshTokenId } from './refreshToken.js'

type BasePayload = {
  userId: string
  accountId?: string
  role?: string
}

export const generateAccessToken = (payload: BasePayload): string => {
  return signJwt({ ...payload, type: 'access' }, ENV.JWT.EXPIRES_IN || '15m')
}

export const generateRefreshToken = (
  payload: BasePayload,
  rememberMe = false,
) => {
  const jti = generateRefreshTokenId()

  return {
    token: signJwt(
      {
        ...payload,
        type: 'refresh',
        jti,
      },
      rememberMe ? '30d' : '7d',
    ),
    jti,
  }
}

export const generateTokenPair = (payload: BasePayload, rememberMe = false) => {
  const accessToken = generateAccessToken(payload)

  const refresh = generateRefreshToken(payload, rememberMe)

  return {
    accessToken,
    refreshToken: refresh.token,
    refreshTokenId: refresh.jti,
  }
}