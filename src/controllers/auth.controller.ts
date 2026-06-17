// /src/controllers/auth.controller.ts

import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import Account from '../models/Account.js'
import Property from '../models/Property.js'

/**
 * @route   POST /api/v1/auth/register
 * @desc    Onboard a new tenant account alongside their initial tracking property
 * @access  Public
 */
export const registerTenant = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { companyName, ownerEmail, password, propertyName, propertyDomain } =
      req.body

    // 1. Inputs Validation Check
    if (
      !companyName ||
      !ownerEmail ||
      !password ||
      !propertyName ||
      !propertyDomain
    ) {
      return next(
        new AppError('All onboarding registration fields are required.', 400),
      )
    }

    // 2. Prevent Duplicate Account Enlistments
    const existingAccount = await Account.findOne({ ownerEmail })
    if (existingAccount) {
      return next(
        new AppError('An account with this email address already exists.', 409),
      )
    }

    // 3. Cryptographic Password Hashing Securely
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    // 4. Atomic Multi-Tenant Provisioning Execution
    const newAccount = await Account.create({
      name: companyName,
      ownerEmail,
      passwordHash,
      plan: 'free',
    })

    const newProperty = await Property.create({
      accountId: newAccount._id,
      name: propertyName,
      domain: propertyDomain,
      settings: {
        themeColor: '#0070f3',
        headingText: 'Chat with us!',
        onlineStatus: true,
      },
    })

    // 5. Structure Industrial Standard Output Envelope
    res.status(201).json({
      status: 'success',
      message: 'Onboarding initialization complete. Property widget ready.',
      data: {
        account: {
          id: newAccount._id,
          name: newAccount.name,
          ownerEmail: newAccount.ownerEmail,
        },
        property: {
          id: newProperty._id,
          name: newProperty.name,
          domain: newProperty.domain,
          widgetId: newProperty.widgetId,
        },
      },
    })
  },
)

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate admin operator and return an encrypted JWT session access token
 * @access  Public
 */
export const loginOperator = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body

    if (!email || !password) {
      return next(new AppError('Please provide both email and password.', 400))
    }

    const account = await Account.findOne({ ownerEmail: email })
    if (!account || !account.isActive) {
      return next(
        new AppError('Invalid email credentials or account is suspended.', 401),
      )
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      account.passwordHash,
    )
    if (!isPasswordCorrect) {
      return next(new AppError('Invalid password credentials.', 401))
    }

    // --- NEW: Fetch the associated property for this account ---
    const property = await Property.findOne({ accountId: account._id })

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key'
    const signOptions: SignOptions = {
      expiresIn:
        (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '7d',
    }

    const token = jwt.sign(
      {
        accountId: account._id.toString(),
        email: account.ownerEmail,
        role: 'admin',
      },
      jwtSecret,
      signOptions,
    )

    res.status(200).json({
      status: 'success',
      message: 'Authentication successful.',
      token,
      data: {
        account: {
          id: account._id,
          name: account.name,
          ownerEmail: account.ownerEmail,
          plan: account.plan,
        },
        property: property
          ? {
              id: property._id,
              widgetId: property.widgetId,
              name: property.name,
            }
          : null,
      },
    })
  },
)