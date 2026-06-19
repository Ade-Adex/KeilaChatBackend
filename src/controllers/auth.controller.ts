// /src/controllers/auth.controller.ts
import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import Account from '../models/Account.js'
import Property from '../models/Property.js'
import * as AuthUtils from '../utils/auth.utils.js'
import { sendWelcomeEmail } from '../lib/email.js'
import bcrypt from 'bcryptjs'

/**
 * @route   POST /api/v1/auth/register
 * @desc    Onboard a new tenant account and their initial property
 * @access  Public
 */
export const registerTenant = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { companyName, ownerEmail, password, propertyName, propertyDomain } =
      req.body

    // 1. Validation
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

    // 2. Duplicate Check
    const existingAccount = await Account.findOne({ ownerEmail })
    if (existingAccount) {
      return next(
        new AppError('An account with this email address already exists.', 409),
      )
    }

    // 3. Account Provisioning
    const passwordHash = await AuthUtils.hashPassword(password)
    const newAccount = await Account.create({
      name: companyName,
      ownerEmail,
      passwordHash,
      plan: 'free',
    })

    // 4. Property Provisioning
    const { widgetId, apiKey } = AuthUtils.generatePropertyCredentials()
    const newProperty = await Property.create({
      accountId: newAccount._id,
      name: propertyName,
      domain: propertyDomain,
      widgetId,
      apiKey,
      details: {
        category: 'General',
        subCategory: '',
        region: 'Global',
        description: '',
        propertyImageUrl: '',
      },
      settings: {
        themeColor: '#0070f3',
        headingText: 'Chat with us!',
        onlineStatus: true,
        trackIp: true,
      },
    })

    // 5. Post-Registration: Welcome Email (Fire and forget)
    sendWelcomeEmail(ownerEmail, companyName).catch((err) =>
      console.error('Registration email failed:', err),
    )

    // 6. Response
    res.status(201).json({
      status: 'success',
      data: {
        account: { id: newAccount._id, name: newAccount.name },
        property: {
          id: newProperty._id,
          widgetId: newProperty.widgetId,
          apiKey: newProperty.apiKey,
        },
      },
    })
  },
)

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate admin and return non-sensitive dashboard data
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

    const isPasswordCorrect = await AuthUtils.verifyPassword(
      password,
      account.passwordHash,
    )
    if (!isPasswordCorrect) {
      return next(new AppError('Invalid password credentials.', 401))
    }

    const property = await Property.findOne({ accountId: account._id })

    const token = AuthUtils.generateSecureToken({
      accountId: account._id.toString(),
      email: account.ownerEmail,
      role: 'admin',
    })

    res.status(200).json({
      status: 'success',
      token,
      data: {
        account: {
          id: account._id,
          name: account.name,
          plan: account.plan,
        },
        property: property
          ? {
              id: property._id,
              name: property.name,
              domain: property.domain,
              widgetId: property.widgetId,
              settings: property.settings,
              details: property.details,
            }
          : null,
      },
    })
  },
)
