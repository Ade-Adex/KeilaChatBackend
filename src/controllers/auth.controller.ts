import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import Account from '../models/Account.js'
import Property from '../models/Property.js'
import Operator from '../models/Operator.js' // 👈 Added
import * as AuthUtils from '../utils/auth.utils.js'
import { sendWelcomeEmail } from '../lib/email.js'
import { normalizeDomain } from '../utils/domain.utils.js'
import { ENV } from '../config/env.js'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: ENV.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Days
}

/**
 * @route   POST /api/v1/auth/register
 * @desc    Onboard a new tenant account and login immediately (Low friction experience)
 * @access  Public
 */
export const registerTenant = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { companyName, ownerEmail, password, propertyName, propertyDomain } =
      req.body

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

    // FIX 2: Validate the domain format UP FRONT before hitting the DB to avoid orphaned data
    const normalizedDomain = normalizeDomain(propertyDomain)
    if (!normalizedDomain) {
      return next(
        new AppError('Invalid domain format. Please provide a valid URL.', 400),
      )
    }

    const existingAccount = await Account.findOne({
      ownerEmail: ownerEmail.toLowerCase().trim(),
    })
    if (existingAccount) {
      return next(
        new AppError('An account with this email address already exists.', 409),
      )
    }

    // 1. Create Tenant Account Frame
    const passwordHash = await AuthUtils.hashPassword(password)
    const newAccount = await Account.create({
      name: companyName,
      ownerEmail: ownerEmail.toLowerCase().trim(),
      passwordHash,
      plan: 'free',
    })

    // FIX 1: Provision the primary Administrator inside your Operator collection
    await Operator.create({
      accountId: newAccount._id,
      email: newAccount.ownerEmail,
      passwordHash,
      role: 'admin',
      status: 'active',
      assignedProperties: [],
      isOnline: false,
    })

    // 2. Create Default Workspace Property
    const { widgetId, apiKey } = AuthUtils.generatePropertyCredentials()
    const dashboardLink = ENV.BASE_URL || ''

    const newProperty = await Property.create({
      accountId: newAccount._id,
      name: propertyName,
      domain: normalizedDomain,
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

    // 3. Authorization Session Emission
    const token = AuthUtils.generateSecureToken({
      accountId: newAccount._id.toString(),
      email: newAccount.ownerEmail,
      role: 'admin',
    })

    res.cookie('auth_token', token, COOKIE_OPTIONS)

    sendWelcomeEmail(newAccount.ownerEmail, companyName, dashboardLink).catch(
      (err) => console.error('Registration email failed:', err),
    )

    res.status(201).json({
      status: 'success',
      token,
      data: {
        account: {
          id: newAccount._id,
          name: newAccount.name,
          plan: newAccount.plan,
        },
        property: {
          id: newProperty._id,
          name: newProperty.name,
          domain: newProperty.domain,
          widgetId: newProperty.widgetId,
          settings: newProperty.settings,
          details: newProperty.details,
        },
      },
    })
  },
)

/**
 * @route   POST /api/v1/auth/register-operator
 * @desc    Accept token verification, attach password data, and authorize session instantly
 * @access  Public
 */
export const registerInvitedOperator = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password, token } = req.body

    if (!email || !password || !token) {
      return next(
        new AppError('Missing required registration credentials.', 400),
      )
    }

    const operator = await Operator.findOne({
      email: email.toLowerCase().trim(),
      inviteToken: token,
      status: 'invited',
    })

    if (!operator) {
      return next(
        new AppError(
          'Invalid token pattern or invite registration correlation match failed.',
          404,
        ),
      )
    }

    // 1. Hydrate security credentials and upgrade record status
    operator.passwordHash = await AuthUtils.hashPassword(password)
    operator.status = 'active'

    // FIX 3: Safe removal method compatible with exactOptionalPropertyTypes: true
    operator.set('inviteToken', undefined)

    await operator.save()

    // 2. Fetch tenant layout context states for your Zustand engine pipeline
    const account = await Account.findById(operator.accountId)
    if (!account) {
      return next(
        new AppError(
          'Associated multi-tenant workspace platform layer missing.',
          404,
        ),
      )
    }

    const property = await Property.findOne({ accountId: account._id })

    // 3. Issue persistent session state cookies
    const sessionToken = AuthUtils.generateSecureToken({
      accountId: account._id.toString(),
      email: operator.email,
      role: operator.role,
    })

    res.cookie('auth_token', sessionToken, COOKIE_OPTIONS)

    res.status(200).json({
      status: 'success',
      token: sessionToken,
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

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate operator (Admin or Agent) and return system session payload
 * @access  Public
 */
export const loginOperator = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body

    if (!email || !password) {
      return next(new AppError('Please provide both email and password.', 400))
    }

    // 1. Locate the individual operator profile instead of the high-level tenant account
    const operator = await Operator.findOne({ email }).select('+passwordHash')
    if (!operator) {
      return next(
        new AppError('No operator profile found with this email.', 401),
      )
    }

    // 🚀 FIX: Type guard verification to confirm passwordHash exists
    if (!operator.passwordHash) {
      return next(
        new AppError(
          'Account credentials are not fully configured. Please complete your registration via the setup link.',
          400,
        ),
      )
    }

    // 2. Check if the individual operator has completed their signup registration/onboarding
    if (operator.status !== 'active') {
      return next(
        new AppError(
          'Your invitation is pending. Please complete registration via your email setup link.',
          403,
        ),
      )
    }

    // 3. Verify the credentials against the operator's password hash
    // TypeScript is happy now because operator.passwordHash is guaranteed to be a string here!
    const isPasswordCorrect = await AuthUtils.verifyPassword(
      password,
      operator.passwordHash,
    )

    // 4. Extract parent tenant workspace context mapping
    const account = await Account.findById(operator.accountId)
    if (!account) {
      return next(
        new AppError('The associated workspace profile no longer exists.', 404),
      )
    }

    if (!account.isActive) {
      return next(
        new AppError(
          'This workspace ecosystem is currently suspended. Please contact your administrator.',
          403,
        ),
      )
    }

    // 5. Query for property settings tied to this workspace layout context
    const property = await Property.findOne({ accountId: account._id })

    // 6. Generate state token containing precise, individual authorization rules (e.g. role: admin | agent)
    const token = AuthUtils.generateSecureToken({
      operatorId: operator._id.toString(),
      accountId: account._id.toString(),
      email: operator.email,
      role: operator.role, // 'admin' or 'agent'
    })

    // Set secure cookie for proxy tracking
    res.cookie('auth_token', token, COOKIE_OPTIONS)

    // 7. Standardized data payload output matches the exact structure required by your Zustand useAuthStore!
    res.status(200).json({
      status: 'success',
      token,
      data: {
        account: {
          id: account._id,
          accountId: account._id, // included both variants to safely satisfy frontend model parsing structures
          name: account.name,
          ownerEmail: operator.email, // satisfies useAuthStore session assignment mapping rules
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

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Clear the application authorization token cookie
 * @access  Public
 */
export const logoutOperator = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully from backend server boundary.',
    })
  }
)