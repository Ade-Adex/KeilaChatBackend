// /src/utils/serverCrypto.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SECRET_HEX = process.env.SERVER_CRYPTO_SECRET || ''

export class ServerCryptoEngine {
  static encrypt(text: string): string {
    if (!text) return ''
    if (SECRET_HEX.length !== 64) {
      throw new Error(
        '[ServerCrypto] SERVER_CRYPTO_SECRET must be a valid 64-character hex string.',
      )
    }
    const key = Buffer.from(SECRET_HEX, 'hex')
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')
    return `${iv.toString('hex')}:${authTag}:${encrypted}`
  }

  static decrypt(encryptedText: string): string {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText
    try {
      const [ivHex, authTagHex, ciphertextHex] = encryptedText.split(':')
      if (!ivHex || !authTagHex || !ciphertextHex) return encryptedText
      const key = Buffer.from(SECRET_HEX, 'hex')
      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)
      let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch {
      return encryptedText
    }
  }
}
