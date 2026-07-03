// /src/services/messagePipeline.service.ts

import ChatSession from '../models/ChatSession.js'
import Operator from '../models/Operator.js'
import Message from '../models/Message.js' 

import { sendMessage } from './message.service.js'
import { EventService } from './event.service.js'
import { QueueService } from './queue.service.js'
import { AssignmentService } from './assignment.service.js'
import { AIService } from './ai.service.js' 

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
    const options: { messageType?: MessageType; isFromAI?: boolean } = {}
    if (messageType) options.messageType = messageType
    if (isFromAI !== undefined) options.isFromAI = isFromAI

    const message = await sendMessage(
      sessionId,
      senderType,
      senderId,
      messageText,
      options,
    )

    const messagePayload = message.toObject ? message.toObject() : { ...message }

    /*
     ****************************************
     * STEP 2: STAMP SENDER META DATA
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
     * STEP 3: GLOBAL ROOM BROADCAST & DASHBOARD UPDATE
     ****************************************
     */
    EventService.emitToSession(sessionId, 'new_message', messagePayload)
    EventService.emitToProperty(propertyId, 'dashboard_message_update', {
      sessionId,
      message: messagePayload,
    })

    /*
     ****************************************
     * STEP 4: AI Routing & Triage
     ****************************************
     */
    if (senderType === 'visitor') {
      if (session.aiEnabled && !session.assignedOperatorId) {
        
        const cleanText = messageText.toLowerCase().trim()
        const isConfirmingTransfer = 
          cleanText === 'yes' || 
          cleanText.includes('transfer') || 
          cleanText.includes('agent') || 
          cleanText.includes('human')

        if (session.status === 'waiting' && isConfirmingTransfer) {
          session.aiEnabled = false
          session.aiEscalated = true
          session.status = 'queued'
          await session.save()
        } else {
          const history = await Message.find({ sessionId }).sort({ createdAt: 1 }).limit(10).lean()
          const aiResult = await AIService.generateReply(messageText, history)

          const aiMessage = await sendMessage(sessionId, 'ai', 'ai_agent', aiResult.reply, {
            messageType: 'text',
            isFromAI: true,
          })
          const aiPayload = aiMessage.toObject ? aiMessage.toObject() : { ...aiMessage }

          EventService.emitToSession(sessionId, 'new_message', aiPayload)
          EventService.emitToProperty(propertyId, 'dashboard_message_update', {
            sessionId,
            message: aiPayload,
          })

          if (aiResult.shouldEscalate) {
            await ChatSession.findByIdAndUpdate(sessionId, {
              status: 'waiting', 
              aiHandled: false
            })
          } else {
            await ChatSession.findByIdAndUpdate(sessionId, {
              status: 'active',
              aiHandled: true
            })
          }

          return messagePayload
        }
      }

      /*
       ****************************************
       * STEP 5: Live Human Operator Auto-assignment
       ****************************************
       */
      session = await ChatSession.findById(sessionId)

      // 🛡️ TS FIX: Handle hypothetical case where session document was completely removed mid-flight
      if (!session) {
        throw new AppError('Chat session context vanished during processing pipeline execution.', 404)
      }

      if (!session.assignedOperatorId && !session.aiEnabled) {
        const operator = await AssignmentService.assignOperatorToSession(propertyId, sessionId)

        if (operator) {
          const opDetails = await Operator.findById(operator._id).select('firstName lastName avatar').lean()

          EventService.emitToOperator(operator._id.toString(), 'chat_assigned', {
            sessionId,
            propertyId,
            operatorId: operator._id,
            operator: opDetails,
          })

          const { PresenceService } = await import('./presence.service.js')
          const operatorSocketId = await PresenceService.getOperatorSocket(operator._id.toString())

          if (operatorSocketId && EventService.io) {
            const activeSocket = EventService.io.sockets.sockets.get(operatorSocketId)
            if (activeSocket) {
              activeSocket.join(`session:${sessionId}`)
            }
          }

          EventService.emitToOperator(operator._id.toString(), 'new_message', messagePayload)
          EventService.emitToProperty(propertyId, 'dashboard_chat_assigned', {
            sessionId,
            operatorId: operator._id,
          })
        } else {
          await QueueService.addToQueue(propertyId, sessionId)
          await ChatSession.findByIdAndUpdate(sessionId, { status: 'queued' })
          EventService.emitToProperty(propertyId, 'dashboard_chat_queued', { sessionId })
        }
      } else if (session.assignedOperatorId) {
        EventService.emitToOperator(session.assignedOperatorId.toString(), 'new_message', messagePayload)
      }
    }

    return messagePayload
  }
}