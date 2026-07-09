  // /src/services/message.service.ts

  import ChatSession from '../models/ChatSession.js'
import Message from '../models/Message.js'

  import { encryptionService } from '../lib/security/encryption.service.js'
import type { MessageType, SenderType } from '../types/message.types.js'
import { AppError } from './appError.js'

  // Send Message

  export async function sendMessage(
    sessionId: string,
    senderType: SenderType,
    senderId: string,
    messageText: string,
    options?: {
      messageType?: MessageType
      isFromAI?: boolean
      media?: string[]
    },
  ) {
    const session = await ChatSession.findById(sessionId)

    if (!session) {
      throw new AppError('Chat session not found', 404)
    }

    // 🎯 Determine messageType context automatically based on payload properties
    let calculatedType = options?.messageType ?? 'text'
    if (
      options?.media &&
      options.media.length > 0 &&
      calculatedType === 'text'
    ) {
      const fallbackUrl = options.media[0] || ''
      const ext = fallbackUrl.split('.').pop()?.toLowerCase() || ''
      if (
        ['mp3', 'wav', 'ogg', 'aac', 'webm'].includes(ext) ||
        fallbackUrl.includes('voice-note')
      ) {
        calculatedType = 'audio'
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        calculatedType = 'image'
      } else {
        calculatedType = 'file'
      }
    }

        const encryptedMessage = messageText
          ? encryptionService.encrypt(messageText)
          : undefined

        const messagePayload: Record<string, unknown> = {
          sessionId,
          senderType,
          senderId,
          messageType: calculatedType,
          status: 'sent',
          isFromAI: options?.isFromAI ?? false,
          media: options?.media ?? [],
        }

        if (encryptedMessage) {
          messagePayload.encryptedMessage = encryptedMessage
        }

        const message = await Message.create(messagePayload as any)

        switch (senderType) {
          case 'operator':
            session.analytics.operatorMessages += 1
            session.unreadVisitor += 1
            break

          case 'ai':
            session.analytics.aiMessages += 1
            session.unreadVisitor += 1
            break

          case 'visitor':
            session.unreadOperator += 1
            break

          case 'system':
          default:
            break
        }

    // Update session preview
    session.lastMessage =
      messageText || `📁 Sent an attachment (${calculatedType})`
    session.lastMessageAt = new Date()

    await session.save()

    const result = message.toObject()

    result.messageText = messageText || ''

    return result

  }

  // System Message, This is what allows: John joined chat, John left chat, Conversation ended, Conversation transferred

  export async function createSystemMessage(sessionId: string, text: string) {
  
    return Message.create({
      sessionId,

      senderType: 'system',

      senderId: 'system',

      encryptedMessage: encryptionService.encrypt(text),

      messageType: 'system',

      status: 'sent',

      isFromAI: false,
    })
  }

  export async function getMessages(sessionId: string) {
    // const messages = await Message.find({
    //   sessionId,
    // })
    //   .sort({
    //     createdAt: 1,
    //   })
    //   .lean()


    const messages = await Message.find({
      sessionId,
    })
      .select('+encryptedMessage')
      .sort({
        createdAt: 1,
      })
      .lean()

    return messages.map((message: any) => ({
      ...message,
      messageText: message.encryptedMessage
        ? encryptionService.decrypt(message.encryptedMessage)
        : '',
    }))
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

   if (
     operatorId &&
     !message.readBy.some((r) => r.operatorId.toString() === operatorId)
   ) {
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



  // Mark all unread messages from a specific sender type as delivered
export async function markAllDelivered(sessionId: string,senderType: 'visitor' | 'operator' | 'ai',) {
  await Message.updateMany(
    {
      sessionId,
      senderType,
      status: 'sent'
    },
    {
      $set: {
        status: 'delivered',
        deliveredAt: new Date()
      }
    }
  )
}

// Mark all unread messages from a specific sender type as seen/read
export async function markAllSeenInSession(sessionId: string,senderType: 'visitor' | 'operator' | 'ai', operatorId?: string) {
  const updateFields: any = {
    status: 'seen',
    seenAt: new Date()
  }

  // If an operator is the one reading visitor messages, keep track of who read it
  if (operatorId && senderType === 'visitor') {
    await Message.updateMany(
      {
        sessionId,
        senderType,
        status: { $ne: 'seen' },
        'readBy.operatorId': { $ne: operatorId }
      },
      {
        $set: updateFields,
        $push: {
          readBy: {
            operatorId,
            readAt: new Date()
          }
        }
      }
    )
  } else {
    // If visitor is reading operator/ai messages
    await Message.updateMany(
      {
        sessionId,
        senderType,
        status: { $ne: 'seen' }
      },
      {
        $set: updateFields
      }
    )
  }

  // Reset counters inside the ChatSession collection
  if (senderType === 'operator' || senderType === 'ai') {
    // Visitor read operator messages -> clear unreadVisitor
    await ChatSession.findByIdAndUpdate(sessionId, { $set: { unreadVisitor: 0 } })
  } else if (senderType === 'visitor') {
    // Operator read visitor messages -> clear unreadOperator
    await ChatSession.findByIdAndUpdate(sessionId, { $set: { unreadOperator: 0 } })
  }
}