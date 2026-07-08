// /src/lib/security/encryption.service.ts

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const KEY_LENGTH = 32

export interface EncryptedPayload {
  cipherText: string
  iv: string
  authTag: string
  algorithm: 'aes-256-gcm'
  keyVersion: number
}

class EncryptionService {
  private readonly key: Buffer
  private readonly keyVersion: number

  constructor() {
    const secret = process.env.MESSAGE_ENCRYPTION_KEY

    if (!secret) {
      throw new Error('MESSAGE_ENCRYPTION_KEY environment variable is missing.')
    }

    this.key = crypto.createHash('sha256').update(secret).digest()

    if (this.key.length !== KEY_LENGTH) {
      throw new Error('Invalid encryption key length.')
    }

    this.keyVersion = Number(process.env.MESSAGE_KEY_VERSION || 1)
  }

  encrypt(plainText: string): EncryptedPayload {
    if (!plainText) {
      return {
        cipherText: '',
        iv: '',
        authTag: '',
        algorithm: 'aes-256-gcm',
        keyVersion: this.keyVersion,
      }
    }

    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv)

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ])

    const authTag = cipher.getAuthTag()

    return {
      cipherText: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: 'aes-256-gcm',
      keyVersion: this.keyVersion,
    }
  }

  decrypt(payload: EncryptedPayload): string {
    if (!payload?.cipherText) return ''

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(payload.iv, 'base64'),
    )

    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.cipherText, 'base64')),
      decipher.final(),
    ])

    return decrypted.toString('utf8')
  }

  isEncrypted(value: unknown): value is EncryptedPayload {
    return (
      typeof value === 'object' &&
      value !== null &&
      'cipherText' in value &&
      'iv' in value &&
      'authTag' in value
    )
  }
}

export const encryptionService = new EncryptionService()
