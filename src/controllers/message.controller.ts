// /src/controllers/message.controller.ts

import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import Message from '../models/Message.js'
import ChatSession from '../models/ChatSession.js'
import Operator from '../models/Operator.js'

export const getSessionMessages = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { sessionId } = req.params
    const { propertyId } = req.query // Enforce multi-tenant cross check isolation filter

    if (!sessionId) {
      return next(
        new AppError('Session instance identifier parameter is required.', 400),
      )
    }

    const session = await ChatSession.findById(sessionId).lean()
    if (!session) {
      return next(
        new AppError('The requested conversation thread does not exist.', 404),
      )
    }

    // Tenant Isolation Security Gate
    if (propertyId && session.propertyId.toString() !== propertyId.toString()) {
      return next(
        new AppError(
          'Unauthorized access: Room instance property mismatch.',
          403,
        ),
      )
    }

    // 1. Fetch raw messages
    const messages = await Message.find({ sessionId })
      .sort({ createdAt: 1 })
      .lean()

    // 2. Hydrate messages with current operator names
    const hydratedMessages = await Promise.all(
      messages.map(async (msg) => {
        if (msg.senderType === 'operator') {
          const operator = await Operator.findById(msg.senderId).lean()
          return {
            ...msg,
            senderName: operator
              ? `${operator.firstName} ${operator.lastName}`.trim()
              : msg.senderName || 'Support',
          }
        }
        return msg
      }),
    )

    res.status(200).json({
      status: 'success',
      results: hydratedMessages.length,
      data: { messages: hydratedMessages },
    })
  },
)
