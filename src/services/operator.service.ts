// /src/services/operator.service.ts

import Operator from '../models/Operator.js'
import Account from '../models/Account.js'
import ChatSession from '../models/ChatSession.js'

import { AppError } from './appError.js'

import { generateInvitationToken } from '../utils/auth/crypto.js'
import { sendOperatorInvitationEmail } from '../lib/email.js'
import { ENV } from '../config/env.js'
import { hashPassword } from '../utils/auth/password.js'
import { Types } from 'mongoose'

export async function getOperatorsByAccount(accountId: string) {
  return Operator.find({
    accountId: new Types.ObjectId(accountId),
  })
    .select('-passwordHash -inviteToken')
    .sort({
      createdAt: -1,
    })
}

export async function inviteOperatorToAccount(
  accountId: string,
  email: string,
  role: 'admin' | 'supervisor' | 'agent',
) {
  const normalizedEmail = email.toLowerCase().trim()
  const BaseURL = ENV.BASE_URL || ''

  const existingOperator = await Operator.findOne({
    accountId: new Types.ObjectId(accountId),
    email: normalizedEmail,
  })

  if (existingOperator) {
    throw new AppError('An operator with this email already exists.', 400)
  }

  const account = await Account.findById(accountId)
  if (!account) {
    throw new AppError('Account not found.', 404)
  }

  const inviteToken = generateInvitationToken()

  await Operator.create({
    accountId: new Types.ObjectId(accountId),
    email: normalizedEmail,
    role,
    status: 'invited',
    inviteToken,
    assignedProperties: [],
    isOnline: false,
  })

  await sendOperatorInvitationEmail(
    normalizedEmail,
    role,
    inviteToken,
    BaseURL,
    account.name,
  )

  return true
}

/**
 * Queries the database for all online and active operator agents within a specific account.
 */
export async function getActiveOperatorsService(
  accountId: string | Types.ObjectId,
) {
  const queryFilter = {
    accountId: new Types.ObjectId(accountId),
    status: 'active' as const,
    isOnline: true,
    availabilityStatus: 'online' as const,
  }

  const operators = await Operator.find(queryFilter)
    .select(
      'firstName lastName avatar email status isOnline availabilityStatus',
    )
    .sort({ firstName: 1 })
    .lean()

  return operators
}

export async function verifyOperatorInvite(token: string) {
  const operator = await Operator.findOne({
    inviteToken: token,
    status: 'invited',
  }).select('email role')

  if (!operator) {
    throw new AppError('This invitation token is invalid or has expired.', 404)
  }

  return {
    email: operator.email,
    role: operator.role,
  }
}

export async function acceptOperatorInvite(
  token: string,
  firstName: string,
  lastName: string,
  password: string,
) {
  const operator = await Operator.findOne({
    inviteToken: token,
    status: 'invited',
  })

  if (!operator) {
    throw new AppError('This invitation token is invalid or has expired.', 404)
  }

  const passwordHash = await hashPassword(password)

  operator.firstName = firstName.trim()
  operator.lastName = lastName.trim()
  operator.passwordHash = passwordHash
  operator.status = 'active'
  operator.inviteToken = null

  await operator.save()
  return operator
}

export async function getOperatorActiveSessions(operatorId: string) {
  return ChatSession.find({
    assignedOperatorId: operatorId,
    status: {
      $in: ['active', 'queued'],
    },
  })
    .sort({
      updatedAt: -1,
    })
    .populate('visitorId', 'name')
    .lean()
}

export async function updateOperatorPresence(
  operatorId: string,
  status: 'online' | 'offline' | 'away',
) {
  const operator = await Operator.findById(operatorId)
  if (!operator) {
    throw new AppError('Operator not found', 404)
  }

  operator.isOnline = status === 'online'
  operator.lastSeen = new Date()

  await operator.save()
  return operator
}

/* -------------------------------------------------------------------------- */
/* 🎯 FIXED: Cast accountId to complete explicit ObjectId format context      */
/* -------------------------------------------------------------------------- */
export async function getAvailableOperators(
  accountId: string | Types.ObjectId,
) {
  return Operator.find({
    accountId: new Types.ObjectId(accountId),

    status: 'active',

    isOnline: true,

    availabilityStatus: 'online',

    $expr: {
      $lt: [
        {
          $ifNull: ['$activeChatsCount', 0],
        },
        {
          $ifNull: ['$maxConcurrentChats', 5],
        },
      ],
    },
  })
    .select('-passwordHash -inviteToken')
    .sort({
      activeChatsCount: 1,
    })
}

