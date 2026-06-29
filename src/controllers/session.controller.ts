// /src/controllers/session.controller.ts

import type { Request, Response, NextFunction } from 'express'

import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'

import {
  getSessionById,
  getActiveSessions,
  getQueuedSessions,
  getPropertySessions,
  initiateVisitorSession,
  getOperatorChatHistory,
} from '../services/session.service.js'

function getParam(value: string | string[] | undefined, name: string): string {
  if (!value || Array.isArray(value)) {
    throw new AppError(`${name} is required`, 400)
  }

  return value
}

export const getSession = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = getParam(req.params.sessionId, 'Session ID')

    const session = await getSessionById(sessionId)

    res.status(200).json({
      status: 'success',
      data: session,
    })
  },
)

export const activeSessions = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = String(req.query.propertyId)

    const sessions = await getActiveSessions(propertyId)

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: sessions,
    })
  },
)

export const queuedSessions = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = String(req.query.propertyId)

    const sessions = await getQueuedSessions(propertyId)

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: sessions,
    })
  },
)

export const operatorSessions = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const operatorId = getParam(req.params.operatorId, 'Operator ID')

    const sessions = await getOperatorChatHistory(operatorId)

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: sessions,
    })
  },
)

export const propertySessions = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = getParam(req.params.propertyId, 'Property ID')

    const sessions = await getPropertySessions(propertyId)

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: sessions,
    })
  },
)

export const initiateSession = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { widgetId, visitorTrackingId } = req.body

    if (!widgetId || !visitorTrackingId) {
      throw new AppError('widgetId and visitorTrackingId are required', 400)
    }

    const session = await initiateVisitorSession({
      widgetId,
      visitorTrackingId,
    })

    res.status(200).json({
      status: 'success',
      data: session,
    })
  },
)