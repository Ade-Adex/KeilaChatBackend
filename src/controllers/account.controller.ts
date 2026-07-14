// /src/controllers/account.controller.ts

import type { Request, Response } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import Account from '../models/Account.js'
import Operator from '../models/Operator.js'
import { AppError } from '../services/appError.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'


/* -------------------------------------------------------------------------- */
/*                            UPDATE WORKSPACE                               */
/* -------------------------------------------------------------------------- */

export const updateWorkspace = catchAsync(
  async (req: Request, res: Response) => {
    const accountId = (req as AuthRequest).user?.accountId
    const { companyName } = req.body


    // console.log("Body", req.body)
    // console.log("companyName", companyName)

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

    return res.status(200).json({
      success: true,
      message: 'Workspace details updated successfully',
      data: {
        account,
      },
    })
  },
)