// /src/controllers/operator.controller.ts
import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import Operator from '../models/Operator.js'
import Account from '../models/Account.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import {
  getOperatorsByAccount,
  inviteOperatorToAccount,
  verifyOperatorInvite,
  acceptOperatorInvite,
  updateOperatorPresence,
  getAvailableOperators,
  getOperatorActiveSessions,
  getActiveOperatorsService,
} from '../services/operator.service.js'

/* -------------------------------------------------------------------------- */
/*                               GET PROFILE                                  */
/* -------------------------------------------------------------------------- */

export const getProfile = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const operatorId = req.user?.userId

    if (!operatorId) {
      return next(new AppError('Unauthorized', 401))
    }

    // const operator = await Operator.findById(operatorId).select(
    //   '-passwordHash -inviteToken',
    // )


    const operator = await Operator.findById(operatorId)
      .select('-passwordHash -inviteToken')
      .populate('assignedProperties', '_id name domain widgetId')
    

    if (!operator) {
      return next(new AppError('Operator not found', 404))
    }

    const account = await Account.findById(operator.accountId)

    return res.status(200).json({
      success: true,
      data: {
        operator,
        account,
      },
    })
  },
)

/* -------------------------------------------------------------------------- */
/*                             UPDATE PROFILE                                 */
/* -------------------------------------------------------------------------- */

export const updateProfile = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const operatorId = req.user?.userId

    if (!operatorId) {
      return next(new AppError('Unauthorized', 401))
    }

    const updated = await Operator.findByIdAndUpdate(
      operatorId,
      {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: req.body.avatar,
      },
      {
        returnDocument: 'after',
      },
    ).select('-passwordHash -inviteToken')

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    })
  },
)

// @desc    Get all operators assigned to an account ecosystem
// @route   GET /api/v1/operators
export const getOperators = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const accountId = req.user?.accountId

    if (!accountId) {
      return next(new AppError('Account context missing.', 400))
    }

    const operators = await getOperatorsByAccount(accountId)

    return res.status(200).json({
      status: 'success',
      data: operators,
    })
  },
)


/**
 * GET /api/v1/operators/active
 * Retrieves online and active operators scoped ONLY to the current operator's account.
 */
export async function getActiveOperatorsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const currentOperatorAccount = (req as any).user?.accountId || (req as any).operator?.accountId

    if (!currentOperatorAccount) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Account context identity verification missing.'
      })
      return
    }
    
    const activeOperators = await getActiveOperatorsService(currentOperatorAccount)

    res.status(200).json({
      status: 'success',
      data: activeOperators,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Invite a team member via secure email hook
// @route   POST /api/v1/operators/invite
export const inviteOperator = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const accountId = req.user?.accountId

    if (!accountId) {
      return next(new AppError('Account context missing.', 400))
    }

    const { email, role, assignedProperties = [] } = req.body

    if (!email) {
      return next(new AppError('Email is required.', 400))
    }

    await inviteOperatorToAccount(accountId, email, role ?? 'agent', assignedProperties,)

    return res.status(200).json({
      status: 'success',
      message: 'Invitation successfully generated and sent.',
    })
  },
)

export const verifyInvite = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.query.token as string

    if (!token) {
      return next(new AppError('Invitation token is required.', 400))
    }

    const invite = await verifyOperatorInvite(token)

    return res.status(200).json({
      status: 'success',
      data: invite,
    })
  },
)

export const acceptInvite = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, firstName, lastName, password } = req.body

    if (!token || !firstName || !lastName || !password) {
      return next(new AppError('Missing required fields.', 400))
    }

    await acceptOperatorInvite(token, firstName, lastName, password)

    return res.status(200).json({
      status: 'success',
      message: 'Operator account activated successfully.',
    })
  },
)

export const getMySessions = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const operatorId = req.user?.userId

    if (!operatorId) {
      return next(new AppError('Unauthorized', 401))
    }

    const sessions = await getOperatorActiveSessions(operatorId)

    return res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: sessions,
    })
  },
)

export const updatePresence = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const operatorId = req.user?.userId

    if (!operatorId) {
      return next(new AppError('Unauthorized', 401))
    }

    const operator = await updateOperatorPresence(operatorId, req.body.status)

    return res.status(200).json({
      status: 'success',
      data: operator,
    })
  },
)

export const availableOperators = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const accountId = req.user?.accountId

    if (!accountId) {
      return next(new AppError('Account context missing', 400))
    }

    const operators = await getAvailableOperators(accountId)

    return res.status(200).json({
      status: 'success',
      data: operators,
    })
  },
)


/* -------------------------------------------------------------------------- */
/* LIVE OPERATOR HEARTBEAT                         */
/* -------------------------------------------------------------------------- */

// 🎯 NEW: Keep the backend presence cache fresh & prevent wrong AI routing triage loops
export const handleHeartbeat = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const operatorId = req.user?.userId

    if (!operatorId) {
      return next(new AppError('Unauthorized: Operator session missing.', 401))
    }

    const opIdStr = operatorId.toString()

    // 1️⃣ Import PresenceService lazily or statically depending on your stack file preferences
    const { PresenceService } = await import('../services/presence.service.js')

    // 2️⃣ Sync runtime states concurrently across layers
    await PresenceService.recordHeartbeat(opIdStr)
    await Operator.updateOne(
      { _id: opIdStr },
      { $set: { lastSeen: new Date(), isOnline: true } }
    )

    return res.status(200).json({
      success: true,
      message: 'Heartbeat acknowledged successfully.',
    })
  },
)