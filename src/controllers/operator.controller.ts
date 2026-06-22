// /src/controllers/operator.controller.ts
import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import Operator from '../models/Operator.js'
import Property from '../models/Property.js' // Imported Property model
import { sendOperatorInvitationEmail } from '../lib/email.js'
import { generateInvitationToken } from '../utils/auth.utils.js'
import { ENV } from '../config/env.js'
import Account from '../models/Account.js'

// @desc    Get all operators assigned to an account ecosystem
// @route   GET /api/v1/operators
export const getOperators = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { accountId } = req.query

    if (!accountId) {
      return next(new AppError('Missing Account ID scope context.', 400))
    }

    const operators = await Operator.find({ accountId: accountId as string })
      .select('-passwordHash -inviteToken')
      .sort({ createdAt: -1 })

    res.status(200).json({
      status: 'success',
      data: operators,
    })
  },
)

// @desc    Invite a team member via secure email hook
// @route   POST /api/v1/operators/invite
export const inviteOperator = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { accountId, email, role } = req.body

    if (!email || !accountId) {
      return next(new AppError('Missing required field entries.', 400))
    }

    const targetEmail = email.toLowerCase().trim()

    // 1. Ensure the operator hasn't already been invited to this account
    const existingOperator = await Operator.findOne({
      accountId,
      email: targetEmail,
    })

    if (existingOperator) {
      return next(
        new AppError(
          'An operator or invitation with this email already exists under your account ecosystem.',
          400,
        ),
      )
    }

 const accountDoc = await Account.findById(accountId)
 const clientCompanyName = accountDoc?.name || 'Our Platform Workspace'

    // Fallback default domain setting if a custom tracking property hasn't been added yet
    // const targetDomain = clientProperty?.domain || ''
    const targetDomain = ENV.BASE_URL || ''

    // 3. Generate secure token
    const inviteToken = generateInvitationToken()

    // 4. Create operator placeholder with an 'invited' flag status
    await Operator.create({
      accountId,
      email: targetEmail,
      role: role || 'agent',
      status: 'invited',
      inviteToken,
      assignedProperties: [],
      isOnline: false,
    })

    // 5. Dispatch email containing the dynamic client domain
    await sendOperatorInvitationEmail(
      targetEmail,
      role || 'agent',
      inviteToken,
      targetDomain,
      clientCompanyName,
    )

    res.status(200).json({
      status: 'success',
      message:
        'Invitation successfully generated and sent to target recipient.',
    })
  },
)
