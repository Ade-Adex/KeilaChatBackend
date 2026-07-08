// /src/controllers/message.controller.ts

import type { Request, Response, NextFunction } from 'express'

import { catchAsync } from '../config/errorHandler.js'

import { AppError } from '../services/appError.js'

import {
  sendMessage,
  getMessages as getSessionMessages,
  markDelivered,
  markSeen,
} from '../services/message.service.js'
import { MessagePipeline } from '../services/messagePipeline.service.js'
import ChatSession from '../models/ChatSession.js'

function getParam(value: string | string[] | undefined, name: string): string {
  if (!value || Array.isArray(value)) {
    throw new AppError(`${name} is required`, 400)
  }

  return value
}

/* -------------------------------------------------- */
/* Send Message                                       */
/* -------------------------------------------------- */

export const createMessage = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
      sessionId,
      senderType,
      messageText,
      messageType,
      isFromAI,
      media,
    } = req.body

    if (!sessionId) {
      return next(new AppError('Session ID is required', 400))
    }

    // 1. Safely extract operator ID from authMiddleware state
    // Cast to 'any' here or import your AuthRequest type interface to read .user properties safely
    const reqWithAuth = req as any
    const authenticatedOperatorId = reqWithAuth.user?.id || reqWithAuth.user?._id

    // 2. Fallback cascade layout: Use explicitly provided body param or fallback to token context
    let finalSenderId = req.body.senderId

    if (senderType === 'operator') {
      finalSenderId = finalSenderId || authenticatedOperatorId

      if (!finalSenderId) {
        return next(new AppError('Authentication context missing or expired for operator', 401))
      }
    }

    const session = await ChatSession.findById(sessionId)

    if (!session) {
      return next(new AppError('Chat session not found.', 404))
    }

    // 3. Forward complete sanitised context to pipeline execution layer
    const message = await MessagePipeline.processMessage({
      sessionId,
      // propertyId: req.body.propertyId,
      propertyId: session.propertyId.toString(),
      senderType,
      senderId: finalSenderId, // <-- Fixed: Passes down verified ID
      messageText,
      messageType,
      isFromAI,
      media,
    })

    res.status(201).json({
      status: 'success',
      data: message,
    })
  },
)

/* -------------------------------------------------- */
/* Get Session Messages                               */
/* -------------------------------------------------- */

export const getMessages = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = getParam(req.params.sessionId, 'Session ID')

   const messages = await getSessionMessages(sessionId)

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: messages,
    })
  },
)

/* -------------------------------------------------- */
/* Mark Delivered                                     */
/* -------------------------------------------------- */

export const deliveredMessage = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const messageId = getParam(req.params.messageId, 'Message ID')

    const message = await markDelivered(messageId)

    res.status(200).json({
      status: 'success',
      data: message,
    })
  },
)

/* -------------------------------------------------- */
/* Mark Read                                          */
/* -------------------------------------------------- */

export const readMessage = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const messageId = getParam(req.params.messageId, 'Message ID')

    const { operatorId } = req.body

    const message = await markSeen(messageId, operatorId)

    res.status(200).json({
      status: 'success',
      data: message,
    })
  },
)
