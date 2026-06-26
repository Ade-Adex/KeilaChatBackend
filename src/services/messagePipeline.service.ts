// /src/services/messagePipeline.service.ts

import ChatSession from '../models/ChatSession.js'

import { sendMessage } from './message.service.js'
import { EventService } from './event.service.js'
import { QueueService } from './queue.service.js'

import { AppError } from './appError.js'
import type { MessageType } from '../types/message.types.js'

export interface ProcessMessagePayload {
  sessionId: string

  propertyId: string

  senderType: 'visitor' | 'operator' | 'ai' | 'system'

  senderId: string

  messageText: string

  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file'

  isFromAI?: boolean
}

export class MessagePipeline {
  static async processMessage(payload: ProcessMessagePayload) {
    const {
      sessionId,
      propertyId,
      senderType,
      senderId,
      messageText,
      messageType,
      isFromAI,
    } = payload

    const session = await ChatSession.findById(sessionId)

    if (!session) {
      throw new AppError('Chat session not found', 404)
    }

    /*
     * STEP 1
     * Save message
     */
    const options: {
      messageType?: MessageType
      isFromAI?: boolean
    } = {}

    if (messageType) {
      options.messageType = messageType
    }

    if (isFromAI !== undefined) {
      options.isFromAI = isFromAI
    }

    const message = await sendMessage(
      sessionId,
      senderType,
      senderId,
      messageText,
      options,
    )

    /*
     * STEP 2
     * Update session preview
     */
    session.lastMessage = messageText
    session.lastMessageAt = new Date()

    await session.save()

    /*
     * STEP 3
     * Notify dashboard
     */
    EventService.emitToProperty(
      propertyId,
      'dashboard_message_update',
      {
        sessionId,
        message,
      },
    )

    /*
     * STEP 4
     * If visitor sends first message,
     * ensure session is in queue
     */
    if (
      senderType === 'visitor' &&
      session.status === 'queued'
    ) {
      await QueueService.addToQueue(
        propertyId,
        sessionId,
      )
    }

    /*
     * STEP 5
     * Future AI processing hook
     */
    if (
      senderType === 'visitor' &&
      session.aiEnabled
    ) {
      // AIService.process(...)
    }

    return message
  }
}