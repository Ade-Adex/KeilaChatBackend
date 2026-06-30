// /src/services/messagePipeline.service.ts

import ChatSession from '../models/ChatSession.js'
import Operator from '../models/Operator.js' // 🎯 Added to retrieve live details

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

    // Convert the Mongoose document to a plain JavaScript object so we can add runtime fields safely
    const messagePayload = message.toObject
      ? message.toObject()
      : { ...message }

    /*
     ****************************************
     * STEP 2: STAMP SENDER META DATA (CRITICAL VISITOR WINDOW FIXED)
     * Here we look up the operator profile and attach fields directly to the event payload.
     ****************************************
     */
    if (senderType === 'operator' && senderId) {
      const activeOperator = await Operator.findById(senderId)
        .select('firstName avatar')
        .lean()
      if (activeOperator) {
        messagePayload.senderName = activeOperator.firstName || 'Support Agent'
        messagePayload.senderAvatar = activeOperator.avatar || ''
      }
    }

    /*
     ****************************************
     * STEP 3: GLOBAL ROOM BROADCAST
     * Passes the custom populated message data to the visitor chat client window!
     ****************************************
     */
    EventService.emitToSession(sessionId, 'new_message', messagePayload)

    /*
     ****************************************
     * STEP 4: Send to dashboard
     ****************************************
     */
    EventService.emitToProperty(propertyId, 'dashboard_message_update', {
      sessionId,
      message: messagePayload,
    })

    /*
     ****************************************
     * STEP 5: Auto assignment & Routing Loops
     ****************************************
     */
    if (senderType === 'visitor' && !session.assignedOperatorId) {
      const operator = await AssignmentService.assignOperatorToSession(
        propertyId,
        sessionId,
      )

      if (operator) {
        session = await ChatSession.findById(sessionId)

        // Fetch operator details for the assignment hook
        const opDetails = await Operator.findById(operator._id)
          .select('firstName lastName avatar')
          .lean()

        EventService.emitToOperator(operator._id.toString(), 'chat_assigned', {
          sessionId,
          propertyId,
          operatorId: operator._id,
          // 🎯 Send the complete populated sub-document to make frontend auto-updates work immediately
          operator: opDetails,
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
          messagePayload,
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
        messagePayload,
      )
    }

    return messagePayload
  }
}