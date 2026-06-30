// /src/services/messagePipeline.service.ts

import ChatSession from '../models/ChatSession.js'

import { sendMessage } from './message.service.js'
import { EventService } from './event.service.js'
import { QueueService } from './queue.service.js'
import { AssignmentService } from './assignment.service.js'

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

    let session = await ChatSession.findById(sessionId)

    if (!session) {
      throw new AppError('Chat session not found', 404)
    }

    /*
     ****************************************
     * STEP 1: Save message to Database
     ****************************************
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
     ****************************************
     * STEP 2: GLOBAL ROOM BROADCAST (CRITICAL FIX)
     * This forces the socket server to broadcast the message to everyone
     * inside `session:${sessionId}`, including the active visitor chat window!
     ****************************************
     */
    EventService.emitToSession(sessionId, 'new_message', message)

    /*
     ****************************************
     * STEP 3: Send to dashboard
     ****************************************
     */
    EventService.emitToProperty(propertyId, 'dashboard_message_update', {
      sessionId,
      message,
    })

    /*
     ****************************************
     * STEP 4: Auto assignment & Routing Loops
     ****************************************
     */
    if (senderType === 'visitor' && !session.assignedOperatorId) {
      const operator = await AssignmentService.assignOperatorToSession(
        propertyId,
        sessionId,
      )

      if (operator) {
        session = await ChatSession.findById(sessionId)

        EventService.emitToOperator(operator._id.toString(), 'chat_assigned', {
          sessionId,
          propertyId,
          operatorId: operator._id,
        })

        const { PresenceService } = await import('./presence.service.js')
        const operatorSocketId = await PresenceService.getOperatorSocket(
          operator._id.toString(),
        )

        if (operatorSocketId && EventService.io) {
          const activeSocket =
            EventService.io.sockets.sockets.get(operatorSocketId)
          if (activeSocket) {
            activeSocket.join(`session:${sessionId}`)
          }
        }

        EventService.emitToOperator(
          operator._id.toString(),
          'new_message',
          message,
        )

        EventService.emitToProperty(propertyId, 'dashboard_chat_assigned', {
          sessionId,
          operatorId: operator._id,
        })
      } else {
        await QueueService.addToQueue(propertyId, sessionId)

        await ChatSession.findByIdAndUpdate(sessionId, {
          status: 'queued',
        })

        EventService.emitToProperty(propertyId, 'dashboard_chat_queued', {
          sessionId,
        })
      }
    } else if (senderType === 'visitor' && session.assignedOperatorId) {
      EventService.emitToOperator(
        session.assignedOperatorId.toString(),
        'new_message',
        message,
      )
    }

    /*
     ****************************************
     * STEP 5: AI hook
     ****************************************
     */
    if (senderType === 'visitor' && session?.aiEnabled) {
      // AIService.process(...)
    }

    return message
  }
}
