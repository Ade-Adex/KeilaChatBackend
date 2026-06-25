// /src/services/messagePipeline.service.ts

import Message from '../models/Message.js'
import ChatSession from '../models/ChatSession.js'
import Property from '../models/Property.js'

import { AssignmentService } from './assignment.service.js'
import { AIService } from './ai.service.js'
import { QueueService } from './queue.service.js'
import { EventService } from './event.service.js'

import type { SenderType } from '../types/message.types.js'

type ProcessMessageInput = {
  sessionId: string
  propertyId: string
  senderType: SenderType
  senderId: string
  messageText: string
}

export class MessagePipeline {
  static async processMessage(data: ProcessMessageInput) {
    const session = await ChatSession.findById(data.sessionId)

    if (!session) {
      throw new Error('Session not found')
    }

    // 1. Save message (USER MESSAGE)
    const message = await Message.create({
      sessionId: data.sessionId,
      senderType: data.senderType,
      senderId: data.senderId,
      messageText: data.messageText,
      isFromAI: false,
      messageType: 'text',
      status: 'sent',
      attachments: [],
      readBy: [],
    })

    // 2. AI RESPONSE (only for visitor)
    if (session.aiEnabled && data.senderType === 'visitor') {
      const ai = await AIService.generateReply(data.messageText, [])

      if (!AIService.shouldEscalate(ai.confidence)) {
        const aiMessage = await Message.create({
          sessionId: data.sessionId,
          senderType: 'ai',
          senderId: 'ai',
          messageText: ai.reply,
          isFromAI: true,
          messageType: 'text',
          status: 'sent',
          attachments: [],
          readBy: [],
        })

        EventService.emitToSession(data.sessionId, 'new_message', aiMessage)
        return aiMessage
      }
    }

    // 3. ASSIGN OPERATOR (SAFE FIXED VERSION)
    if (!session.assignedOperatorId) {
      const property = await Property.findById(session.propertyId).lean()

      if (!property) {
        throw new Error('Property not found for session')
      }

      const operator = await AssignmentService.assignOperator(
        property.accountId.toString(),
      )

      if (operator) {
        session.assignedOperatorId = operator._id as any
        session.status = 'active'
        await session.save()
      } else {
        await QueueService.addToQueue(
          session.propertyId.toString(),
          session._id.toString(),
        )
        session.status = 'queued'
        await session.save()
      }
    }

    // 4. BROADCAST MESSAGE
    EventService.emitToSession(data.sessionId, 'new_message', message)

    return message
  }
}