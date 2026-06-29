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
     * STEP 1
     * Save message
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
     * STEP 2
     * Send to dashboard
     ****************************************
     */
    EventService.emitToProperty(propertyId, 'dashboard_message_update', {
      sessionId,
      message,
    })

    /*
     ****************************************
     * STEP 3
     * Auto assignment
     ****************************************
     */
    if (senderType === 'visitor' && !session.assignedOperatorId) {
      const operator = await AssignmentService.assignOperatorToSession(
        propertyId,
        sessionId,
      )

      /*
       ********************************
       * OPERATOR FOUND
       ********************************
       */
      if (operator) {
        session = await ChatSession.findById(sessionId)

        /*
         * notify assigned operator
         */
        EventService.emitToOperator(operator._id.toString(), 'chat_assigned', {
          sessionId,
          propertyId,
          operatorId: operator._id,
        })

        /*
         * FORCE OPERATOR SOCKET INTO SOCKET.IO SESSION ROOM
         * This ensures they receive subsequent messages sent to the session room.
         */
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

        /*
         * VERY IMPORTANT:
         * send first visitor message
         */
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

      /*
       ********************************
       * NO OPERATOR
       ********************************
       */
        await QueueService.addToQueue(propertyId, sessionId)

        await ChatSession.findByIdAndUpdate(sessionId, {
          status: 'queued',
        })

        EventService.emitToProperty(propertyId, 'dashboard_chat_queued', {
          sessionId,
        })
      }
    } else if (senderType === 'visitor' && session.assignedOperatorId) {

    /*
     ****************************************
     * STEP 4
     * Existing assigned operator
     ****************************************
     */
      EventService.emitToOperator(
        session.assignedOperatorId.toString(),
        'new_message',
        message,
      )
    }

    /*
     ****************************************
     * STEP 5
     * AI hook
     ****************************************
     */
    if (senderType === 'visitor' && session?.aiEnabled) {
      // AIService.process(...)
    }

    return message
  }
}
