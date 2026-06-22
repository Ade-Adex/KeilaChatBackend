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





/**
 * @route   POST /api/v1/sessions/:sessionId/messages
 * @desc    Save operator-side message text and emit it down the WebSocket stream real-time
 * @access  Private (Operator Dashboard Panel)
 */
export const sendOperatorMessage = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { sessionId } = req.params
    const { propertyId, senderId, messageText } = req.body

    if (!sessionId || !propertyId || !senderId || !messageText) {
      return next(new AppError('Required payload fields missing.', 400))
    }

    const session = await ChatSession.findById(sessionId)
    if (!session || session.status === 'closed') {
      return next(new AppError('This conversation session is inactive or does not exist.', 400))
    }

    // Security Multi-Tenant Guard Check
    if (session.propertyId.toString() !== propertyId.toString()) {
      return next(new AppError('Cross-site messaging intercept prevented.', 403))
    }

    // Hydrate current operator full name details securely
    const operator = await Operator.findById(senderId).lean()
    const senderName = operator 
      ? `${operator.firstName} ${operator.lastName}`.trim() 
      : 'Support Agent'

    const savedMessage = await Message.create({
      sessionId: session._id,
      senderType: 'operator',
      senderId,
      senderName,
      messageText,
      createdAt: new Date(),
      isRead: false,
    })

    // CRITICAL CORRECTION: Extract socket server reference and emit message instantly
    const socketService = req.app.get('socketService')
    if (socketService) {
      const io = socketService.getIO()
      const roomName = `session:${sessionId}`
      io.to(roomName).emit('new_message', savedMessage)
    }

    res.status(201).json({
      status: 'success',
      data: { message: savedMessage },
    })
  }
)