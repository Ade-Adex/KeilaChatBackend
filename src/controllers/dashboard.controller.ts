// /src/controllers/dashboard.controller.ts

import type { Request, Response } from 'express'
import { DashboardService } from '../services/dashboard.service.js'

export const getOverview = async (req: Request, res: Response) => {
  const propertyId = String(req.params.propertyId)

  const data = await DashboardService.getOverview(propertyId)

  res.status(200).json({
    status: 'success',
    data,
  })
}

export const getQueue = async (req: Request, res: Response) => {
  const propertyId = String(req.params.propertyId)

  const data = await DashboardService.getQueue(propertyId)

  res.status(200).json({
    status: 'success',
    data,
  })
}

export const getActiveChats = async (req: Request, res: Response) => {
  const propertyId = String(req.params.propertyId)

  const data = await DashboardService.getActiveChats(propertyId)

  res.status(200).json({
    status: 'success',
    data,
  })
}