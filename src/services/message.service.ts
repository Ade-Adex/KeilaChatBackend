// /src/services/message.service.ts

import Message from '../models/Message.js'
import ChatSession from '../models/ChatSession.js'

import { AppError } from './appError.js'
import type { MessageType, SenderType } from '../types/message.types.js'

// Send Message

export async function sendMessage(
  sessionId: string,
  senderType: SenderType,
  senderId: string,
  messageText: string,
  options?: {
    messageType?: MessageType
    isFromAI?: boolean
  },
) {
  const session = await ChatSession.findById(sessionId)

  if (!session) {
    throw new AppError('Chat session not found', 404)
  }

  const message = await Message.create({
    sessionId,

    senderType,

    senderId,

    messageText,

    messageType: options?.messageType ?? 'text',

    status: 'sent',

    isFromAI: options?.isFromAI ?? false,
  })

  // Update analytics
  session.analytics.totalMessages += 1

  switch (senderType) {
    case 'visitor':
      session.analytics.visitorMessages += 1
      session.unreadOperator += 1
      break

    case 'operator':
      session.analytics.operatorMessages += 1
      session.unreadVisitor += 1
      break

    case 'ai':
      session.analytics.aiMessages += 1
      session.unreadVisitor += 1
      break

    case 'system':
      break
  }

  // Update session preview
  session.lastMessage = messageText
  session.lastMessageAt = new Date()

  await session.save()

  return message
}

// System Message, This is what allows: John joined chat, John left chat, Conversation ended, Conversation transferred

export async function createSystemMessage(sessionId: string, text: string) {
  return Message.create({
    sessionId,

    senderType: 'system',

    senderId: 'system',

    messageText: text,

    messageType: 'system',

    status: 'sent',

    isFromAI: false,
  })
}

// Get Messages

export async function getMessages(sessionId: string) {
  return Message.find({
    sessionId,
  })
    .sort({
      createdAt: 1,
    })
    .lean()
}

// Delivered

export async function markDelivered(messageId: string) {
  return Message.findByIdAndUpdate(
    messageId,
    {
      status: 'delivered',
    },
    {
      new: true,
    },
  )
}

// Seen

export async function markSeen(messageId: string, operatorId?: string) {
  const message = await Message.findById(messageId)

  if (!message) {
    throw new AppError('Message not found', 404)
  }

  message.status = 'seen'

  if (operatorId) {
    message.readBy.push({
      operatorId,
      readAt: new Date(),
    })
  }

  await message.save()

  return message
}

// End Conversation Message

export async function endConversation(sessionId: string) {
  return createSystemMessage(sessionId, 'Conversation ended')
}

// Operator Joined Message

export async function operatorJoined(sessionId: string, operatorName: string) {
  return createSystemMessage(sessionId, `${operatorName} joined the chat`)
}

// Operator Left Message

export async function operatorLeft(sessionId: string, operatorName: string) {
  return createSystemMessage(sessionId, `${operatorName} left the chat`)
}