// /src/controllers/account.controller.ts

import type { Request, Response } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import Account from '../models/Account.js'
import Operator from '../models/Operator.js'
import { AppError } from '../services/appError.js'

/* -------------------------------------------------------------------------- */
/*                             GET WORKSPACE                                 */
/* -------------------------------------------------------------------------- */

export const getWorkspace = catchAsync(async (req: Request, res: Response) => {
  const accountId = (req as any).user?.accountId

  if (!accountId) {
    throw new AppError('Unauthorized workspace access', 401)
  }

  const account = await Account.findById(accountId)

  if (!account) {
    throw new AppError('Workspace not found', 404)
  }

  res.status(200).json({
    success: true,
    data: {
      account,
    },
  })
})

/* -------------------------------------------------------------------------- */
/*                            UPDATE WORKSPACE                               */
/* -------------------------------------------------------------------------- */

export const updateWorkspace = catchAsync(
  async (req: Request, res: Response) => {
    const accountId = (req as any).user?.accountId
    const { companyName } = req.body

    if (!accountId) {
      throw new AppError('Unauthorized workspace update', 401)
    }

    const account = await Account.findById(accountId)

    if (!account) {
      throw new AppError('Workspace not found', 404)
    }

    if (companyName) {
      account.name = companyName
    }

    await account.save()

    res.status(200).json({
      success: true,
      data: {
        account,
      },
    })
  },
)