// // /src/controllers/dashboard.controller.ts

// import type { Request, Response } from 'express'
// import { DashboardService } from '../services/dashboard.service.js'

// export const getOverview = async (req: Request, res: Response) => {
//   const propertyId = String(req.params.propertyId)

//   const data = await DashboardService.getOverview(propertyId)

//   res.status(200).json({
//     status: 'success',
//     data,
//   })
// }

// export const getQueue = async (req: Request, res: Response) => {
//   const propertyId = String(req.params.propertyId)

//   const data = await DashboardService.getQueue(propertyId)

//   res.status(200).json({
//     status: 'success',
//     data,
//   })
// }

// export const getActiveChats = async (req: Request, res: Response) => {
//   const propertyId = String(req.params.propertyId)

//   const data = await DashboardService.getActiveChats(propertyId)

//   res.status(200).json({
//     status: 'success',
//     data,
//   })
// }







import type { Response } from 'express'
import { DashboardService } from '../services/dashboard.service.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { catchAsync } from '../config/errorHandler.js'

/* -------------------------------------------------------------------------- */
/* GET DASHBOARD OVERVIEW                            */
/* -------------------------------------------------------------------------- */
export const getOverview = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const propertyId = String(req.params.propertyId)
    const accountId = req.headers['x-account-id'] as string

    const dashboardContext = await DashboardService.getDashboardContext(
      propertyId,
      accountId,
    )
    const traditionalMetrics = await DashboardService.getOverview(propertyId)

    res.status(200).json({
      success: true,
      data: {
        ...traditionalMetrics,
        property: dashboardContext.property,
      },
    })
  },
)

/* -------------------------------------------------------------------------- */
/* GET QUEUE METRICS                              */
/* -------------------------------------------------------------------------- */
export const getQueue = catchAsync(async (req: AuthRequest, res: Response) => {
  const propertyId = String(req.params.propertyId)
  const data = await DashboardService.getQueue(propertyId)

  res.status(200).json({
    success: true,
    data,
  })
})

/* -------------------------------------------------------------------------- */
/* GET ACTIVE CHATS STATE                             */
/* -------------------------------------------------------------------------- */
export const getActiveChats = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const propertyId = String(req.params.propertyId)
    const data = await DashboardService.getActiveChats(propertyId)

    res.status(200).json({
      success: true,
      data,
    })
  },
)