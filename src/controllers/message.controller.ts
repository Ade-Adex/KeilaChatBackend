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
      senderId,
      messageText,
      messageType,
      isFromAI,
    } = req.body

    if (!sessionId) {
      return next(new AppError('Session ID is required', 400))
    }

    const message = await MessagePipeline.processMessage({
      sessionId,
      propertyId: req.body.propertyId,
      senderType,
      senderId,
      messageText,
      messageType,
      isFromAI,
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
