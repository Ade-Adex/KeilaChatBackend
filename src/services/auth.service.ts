// /src/services/auth.service.ts

import Operator from '../models/Operator.js'
import Account from '../models/Account.js'
import { hashPassword, verifyPassword } from '../utils/auth/password.js'
import { generateTokenPair } from '../utils/auth/tokens.js'
import { generateInvitationToken } from '../utils/auth/crypto.js'
import { createHash } from 'node:crypto'
import Property from '../models/Property.js'
import { normalizeDomain } from '../utils/domain.utils.js'
import logger from '../bootstrap/logger.js'
import { generatePropertyCredentials } from '../utils/property/credentials.js'
import { sendPasswordResetEmail } from '../lib/email.js'

type OperatorRole = 'admin' | 'supervisor' | 'agent'

export class AuthService {
  /**
   * Register a new tenant (Account owner)
   */
  static async registerTenant(data: {
    name: string
    email: string
    password: string
  }) {
    const existing = await Account.findOne({ ownerEmail: data.email })
    if (existing) throw new Error('Account already exists')

    const account = await Account.create({
      name: data.name,
      ownerEmail: data.email,
      plan: 'free',
      settings: {
        aiEnabled: true,
        maxOperators: 5,
        maxVisitors: 1000,
      },
    })

    const passwordHash = await hashPassword(data.password)

    const owner = await Operator.create({
      accountId: account._id,
      email: data.email,
      passwordHash,
      role: 'admin',
      status: 'active',
      isOnline: false,
      activeChatsCount: 0,
      maxConcurrentChats: 10,
      permissions: ['*'],
    })

    const tokens = generateTokenPair({
      userId: owner._id.toString(),
      accountId: account._id.toString(),
      role: owner.role,
    })

    return {
      account,
      operator: owner,
      tokens,
    }
  }

  /**
   * Login operator
   */
  static async loginOperator(data: {
    email: string
    password: string
    rememberMe?: boolean
  }) {
    const operator = await Operator.findOne({
      email: data.email.toLowerCase().trim(),
    })

    if (!operator) throw new Error('Invalid credentials')

    if (!operator.passwordHash)
      throw new Error('Account not configured for login')

    const isValid = await verifyPassword(data.password, operator.passwordHash)

    if (!isValid) throw new Error('Invalid credentials')

    const account = await Account.findById(operator.accountId)

    if (!account) {
      throw new Error('Account not found')
    }

    operator.isOnline = true

    await operator.save()

    const tokens = generateTokenPair(
      {
        userId: operator._id.toString(),
        accountId: operator.accountId.toString(),
        role: operator.role,
      },
      data.rememberMe,
    )
    

    return {
      tokens,

      operator: {
        _id: operator._id,
        accountId: operator.accountId,
        firstName: operator.firstName,
        lastName: operator.lastName,
        email: operator.email,
        avatar: operator.avatar,
        role: operator.role,
        status: operator.status,
        permissions: operator.permissions,
        isOnline: operator.isOnline,
        activeChatsCount: operator.activeChatsCount,
        maxConcurrentChats: operator.maxConcurrentChats,
        createdAt: operator.createdAt,
        updatedAt: operator.updatedAt,
      },

      account,
    }
  }

  /**
   * Forgot Password
   */
  static async forgotPassword(email: string, origin: string) {
    const operator = await Operator.findOne({
      email: email.toLowerCase().trim(),
    })

    // Prevent email enumeration
    if (!operator) {
      return
    }

    const resetToken = generateInvitationToken()

    operator.resetPasswordToken = createHash('sha256')
      .update(resetToken)
      .digest('hex')

    operator.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000)

    await operator.save()

    const resetLink = `${origin}/reset-password?token=${resetToken}`

    await sendPasswordResetEmail(operator.email, resetLink)
  }

  /**
   * Reset Password
   */
  static async resetPassword(token: string, password: string) {
    const hashedToken = createHash('sha256').update(token).digest('hex')

    const operator = await Operator.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        $gt: new Date(),
      },
    })

    if (!operator) {
      throw new Error('Reset token is invalid or has expired.')
    }

    operator.passwordHash = await hashPassword(password)

    operator.resetPasswordToken = null
    operator.resetPasswordExpires = null

    await operator.save()

    return operator
  }

  /**
   * Update Profile
   */
  static async updateProfile(
    operatorId: string,
    data: {
      firstName?: string
      lastName?: string
      email?: string
      avatar?: string
      propertyName?: string
      domain?: string
      allowedDomains?: string[]
    },
  ) {
    const operator = await Operator.findById(operatorId)

    if (!operator) {
      throw new Error('Operator not found')
    }

    if (data.firstName !== undefined) operator.firstName = data.firstName

    if (data.lastName !== undefined) operator.lastName = data.lastName

    if (data.email !== undefined)
      operator.email = data.email.toLowerCase().trim()

    if (data.avatar !== undefined) operator.avatar = data.avatar

    await operator.save()

    let property = await Property.findOne({
      accountId: operator.accountId,
    })

    const normalizedDomain = normalizeDomain(data.domain)

    if (!property) {
      const credentials = generatePropertyCredentials()

      property = await Property.create({
        accountId: operator.accountId,

        name: data.propertyName || 'My Website',

        domain: normalizedDomain ?? '',

        allowedDomains:
          (data.allowedDomains
            ?.map((d) => normalizeDomain(d))
            .filter(Boolean) as string[]) || [],

        widgetId: credentials.widgetId,
        apiKey: credentials.apiKey,
      })
    } else {
      if (data.propertyName !== undefined) {
        property.name = data.propertyName
      }

      if (normalizedDomain) {
        property.domain = normalizedDomain
      }

      if (data.allowedDomains) {
        property.allowedDomains = data.allowedDomains
          .map((d) => normalizeDomain(d))
          .filter(Boolean) as string[]
      }

      await property.save()
    }

    logger.info(
      {
        operatorId,
        accountId: operator.accountId,
      },
      'Profile updated successfully',
    )

    return {
      operator,
      property,
    }
  }

  /**
   * Invite operator (RBAC entry point)
   */

  static async inviteOperator(data: {
    accountId: string
    email: string
    role?: OperatorRole
  }) {
    const inviteToken = generateInvitationToken()

    const operator = await Operator.create({
      accountId: data.accountId,
      email: data.email,
      role: data.role ?? 'agent',
      status: 'invited',
      inviteToken,
      permissions: [],
      isOnline: false,
      activeChatsCount: 0,
      maxConcurrentChats: 5,
    })

    return operator
  }
}