// /src/services/messagePipeline.service.ts

import ChatSession from '../models/ChatSession.js'
import Operator from '../models/Operator.js'
import Property from '../models/Property.js'
import { sendMessage, createSystemMessage } from './message.service.js'
import { EventService } from './event.service.js'
import { QueueService } from './queue.service.js'
import { AssignmentService } from './assignment.service.js'
import { AIService } from './ai.service.js'
import { getAvailableOperators } from './operator.service.js'
import { AppError } from './appError.js'
import type { MessageType } from '../types/message.types.js'
import { Types } from 'mongoose'
import Message from '../models/Message.js'

export interface ProcessMessagePayload {
  sessionId: string
  propertyId: string
  senderType: 'visitor' | 'operator' | 'ai' | 'system'
  senderId: string
  messageText: string
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file'
  isFromAI?: boolean
  media?: string[]
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
      media,
    } = payload

    let session = await ChatSession.findById(sessionId)
    if (!session) {
      throw new AppError('Chat session not found', 404)
    }

    /* ****************************************
     * STEP 1: Save message to Database
     **************************************** */
    // const options: { messageType?: MessageType; isFromAI?: boolean } = {}
    // if (messageType) options.messageType = messageType
    // if (isFromAI !== undefined) options.isFromAI = isFromAI

    const options: {
      messageType?: MessageType
      isFromAI?: boolean
      media?: string[]
    } = {}
    if (messageType) options.messageType = messageType
    if (isFromAI !== undefined) options.isFromAI = isFromAI
    if (media) options.media = media

    const message = await sendMessage(
      sessionId,
      senderType,
      senderId,
      messageText,
      options,
    )

    const messagePayload = message.toObject
      ? message.toObject()
      : { ...message }

    /* ****************************************
     * STEP 2: STAMP SENDER META DATA
     **************************************** */
    if (senderType === 'operator' && senderId) {
      const activeOperator = await Operator.findById(senderId)
        .select('firstName avatar')
        .lean()
      if (activeOperator) {
        messagePayload.senderName = activeOperator.firstName || 'Support Agent'
        messagePayload.senderAvatar = activeOperator.avatar || ''
      }
    }

    /* ****************************************
     * STEP 3: GLOBAL ROOM BROADCAST & DASHBOARD UPDATE
     **************************************** */
    EventService.emitToSession(sessionId, 'new_message', messagePayload)
    EventService.emitToProperty(propertyId, 'dashboard_message_update', {
      sessionId,
      message: messagePayload,
    })

    /* ****************************************
     * STEP 4: AI Routing & Triage
     **************************************** */
    if (senderType === 'visitor') {
      if (session.aiEnabled && !session.assignedOperatorId) {
        const cleanText = messageText.toLowerCase().trim()
        const isConfirmingTransfer =
          cleanText === 'yes' ||
          cleanText.includes('transfer') ||
          cleanText.includes('agent') ||
          cleanText.includes('human')

        /* --- SUB-ROUTE A: VISITOR IS CONFIRMING A HUMAN TRANSFER REQUEST --- */
        if (session.status === 'waiting' && isConfirmingTransfer) {
          const propertyDoc = await Property.findById(session.propertyId)
            .select('accountId')
            .lean()
          const accountIdStr = propertyDoc?.accountId
            ? propertyDoc.accountId.toString()
            : ''

          const availableOperators = await getAvailableOperators(accountIdStr)

          if (
            availableOperators &&
            availableOperators.length > 0 &&
            availableOperators[0]
          ) {
            const targetOperator = availableOperators[0]
            const targetOperatorId = targetOperator._id.toString()

            session.aiEnabled = false
            session.aiEscalated = true
            session.status = 'active'
            session.assignedOperatorId = new Types.ObjectId(targetOperatorId)
            await session.save()

            await Operator.updateOne(
              { _id: targetOperatorId },
              { $inc: { activeChatsCount: 1 } },
            )

            const transferText =
              `Chat was transferred from AI to ${targetOperator.firstName || ''} ${targetOperator.lastName || ''}`.trim()
            const systemNotice = await createSystemMessage(
              sessionId,
              transferText,
            )

            EventService.emitToSession(
              sessionId,
              'new_message',
              systemNotice.toObject ? systemNotice.toObject() : systemNotice,
            )
            EventService.emitToSession(sessionId, 'session_status_changed', {
              sessionId,
              status: 'active',
            })

            const { PresenceService } = await import('./presence.service.js')
            const operatorSocketId =
              await PresenceService.getOperatorSocket(targetOperatorId)

            if (operatorSocketId && EventService.io) {
              const activeSocket =
                EventService.io.sockets.sockets.get(operatorSocketId)
              if (activeSocket) {
                activeSocket.join(`session:${sessionId}`)
                activeSocket.join(`property:dashboard:${propertyId}`)
              }
            }

            EventService.emitToOperator(targetOperatorId, 'chat_assigned', {
              sessionId,
              propertyId,
              operatorId: targetOperatorId,
              operator: {
                firstName: targetOperator.firstName,
                lastName: targetOperator.lastName,
                avatar: targetOperator.avatar,
              },
            })

            EventService.emitToProperty(
              propertyId,
              'dashboard_refresh_request',
              {},
            )
            return messagePayload
          } else {
            const fallbackReply =
              'I am ready to transfer you, but all of our support representatives are currently offline or handling other inquiries. Please hold, or leave your message here and an agent will follow up with you as soon as possible.'
            const aiFallbackMsg = await sendMessage(
              sessionId,
              'ai',
              'ai_agent',
              fallbackReply,
              { messageType: 'text', isFromAI: true },
            )
            EventService.emitToSession(
              sessionId,
              'new_message',
              aiFallbackMsg.toObject ? aiFallbackMsg.toObject() : aiFallbackMsg,
            )
            return messagePayload
          }
        }

        /* --- SUB-ROUTE B: STANDARD INCOMING AI KNOWLEDGE ENGINE QUERY Evaluation --- */
        // Retrieve message history context records to satisfy parameter typing contracts
        const historyMessages = await Message.find({ sessionId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()

        // Dispatch query generation down to our newly integrated AI engine
        const aiResponse = await AIService.generateReply(
          messageText,
          historyMessages,
        )

        // Save AI execution text directly into the database timeline channel
        const aiMessage = await sendMessage(
          sessionId,
          'ai',
          'ai_agent',
          aiResponse.reply,
          {
            messageType: 'text',
            isFromAI: true,
          },
        )

        const aiPayload = aiMessage.toObject
          ? aiMessage.toObject()
          : { ...aiMessage }
        EventService.emitToSession(sessionId, 'new_message', aiPayload)
        EventService.emitToProperty(propertyId, 'dashboard_message_update', {
          sessionId,
          message: aiPayload,
        })

        // Check if the AI determined it needs to hand off to a human queue structure
        if (aiResponse.shouldEscalate) {
          session.status = 'waiting' // Mark session waiting for human response approval
          await session.save()

          EventService.emitToProperty(
            propertyId,
            'dashboard_refresh_request',
            {},
          )
        }
      }
    }

    /* ****************************************
     * STEP 5: Live Human Operator Auto-assignment (Standard Fallback Check)
     **************************************** */
    session = await ChatSession.findById(sessionId)
    if (!session) {
      throw new AppError(
        'Chat session context vanished during processing pipeline execution.',
        404,
      )
    }

    if (!session.assignedOperatorId && !session.aiEnabled) {
      const operator = await AssignmentService.assignOperatorToSession(
        propertyId,
        sessionId,
      )

      if (operator) {
        const opDetails = await Operator.findById(operator._id)
          .select('firstName lastName avatar')
          .lean()

        EventService.emitToOperator(operator._id.toString(), 'chat_assigned', {
          sessionId,
          propertyId,
          operatorId: operator._id,
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
        await ChatSession.findByIdAndUpdate(sessionId, { status: 'queued' })
        EventService.emitToProperty(propertyId, 'dashboard_chat_queued', {
          sessionId,
        })
      }
    } else if (session.assignedOperatorId) {
      EventService.emitToOperator(
        session.assignedOperatorId.toString(),
        'new_message',
        messagePayload,
      )
    }

    return messagePayload
  }
}