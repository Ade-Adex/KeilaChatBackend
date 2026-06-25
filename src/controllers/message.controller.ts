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
    const { propertyId } = req.query

    if (!sessionId) {
      return next(new AppError('Session ID is required.', 400))
    }

    const session = await ChatSession.findById(sessionId).lean()
    if (!session) {
      return next(new AppError('Session not found.', 404))
    }

    // tenant check
    if (propertyId && session.propertyId.toString() !== propertyId.toString()) {
      return next(new AppError('Unauthorized access.', 403))
    }

    const messages = await Message.find({ sessionId })
      .sort({ createdAt: 1 })
      .lean()

    const hydratedMessages = await Promise.all(
      messages.map(async (msg) => {
        let senderName: string | undefined

        if (msg.senderType === 'operator') {
          const operator = await Operator.findById(msg.senderId).lean()

          senderName = operator
            ? `${operator.firstName ?? ''} ${operator.lastName ?? ''}`.trim()
            : 'Support'
        }

        if (msg.senderType === 'ai') {
          senderName = 'AI Assistant'
        }

        if (msg.senderType === 'system') {
          senderName = 'System'
        }

        return {
          ...msg,
          senderName, // injected dynamically (NOT stored in DB)
        }
      }),
    )

    res.status(200).json({
      status: 'success',
      results: hydratedMessages.length,
      data: { messages: hydratedMessages },
    })
  },
)
