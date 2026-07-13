  // /src/services/messagePipeline.service.ts

  import { Types } from 'mongoose'
  import { encryptionService } from '../lib/security/encryption.service.js'
  import ChatSession from '../models/ChatSession.js'
  import Message from '../models/Message.js'
  import Operator from '../models/Operator.js'
  import Property from '../models/Property.js'
  import type { MessageType } from '../types/message.types.js'
  import { AIService } from './ai.service.js'
  import { AppError } from './appError.js'
  import { AssignmentService } from './assignment.service.js'
  import { EventService } from './event.service.js'
  import { createSystemMessage, sendMessage } from './message.service.js'
  import { getAvailableOperators } from './operator.service.js'
  import { QueueService } from './queue.service.js'
  import logger from '../bootstrap/logger.js'

  export interface ProcessMessagePayload {
    sessionId: string
    propertyId: string
    senderType: 'visitor' | 'operator' | 'ai' | 'system'
    senderId: string
    messageText: string
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'media'
    isFromAI?: boolean
    media?: string[]
  }


  const VISITOR_POPULATE_FIELDS =
    'name email metadata tags notes firstVisitAt unreadMessages currentPage referrer isOnline lastSeen pageViews chatOpened'

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
      * STEP 1: Process Media & Save message to Database
      **************************************** */
      const options: {
        messageType?: MessageType
        isFromAI?: boolean
        media?: string[]
        attachments?: Array<{
          fileUrl: string
          fileName: string
          fileType: string
        }>
      } = {}

      if (isFromAI !== undefined) options.isFromAI = isFromAI
      if (media) options.media = media

      // 🎯 Use a plain string for extraction logic to avoid strict union check errors
      let finalType: string = messageType || 'text'

      if (media && media.length > 0) {
        options.attachments = media.map((url) => {
          let fileType = 'application/octet-stream'

          if (url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
            fileType = 'image/jpeg'
            if (finalType === 'text' || finalType === 'media') {
              finalType = 'image'
            }
          } else if (url.match(/\.(webm|ogg|mp4|mp3|wav|aac|m4a)/i)) {
            fileType = 'audio/webm'
            if (finalType === 'text' || finalType === 'media') {
              finalType = 'audio'
            }
          } else if (url.match(/\.(mov|mkv|wmv)/i)) {
            fileType = 'video/mp4'
            if (finalType === 'text' || finalType === 'media') {
              finalType = 'video'
            }
          } else {
            if (finalType === 'text' || finalType === 'media') {
              finalType = 'file'
            }
          }

          return {
            fileUrl: url,
            fileName: url.substring(url.lastIndexOf('/') + 1) || 'attachment',
            fileType: fileType,
          }
        })
      }

      // 🎯 Safely cast to MessageType now that it's guaranteed to be a valid database value
      options.messageType = finalType as MessageType

      const message = await sendMessage(
        sessionId,
        senderType,
        senderId,
        messageText,
        options,
      )

      const messagePayload = message as any

      /* ****************************************
      * STEP 2: STAMP SENDER METADATA
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

      const fullyPopulatedSession = await ChatSession.findById(sessionId)
        .populate('visitorId', VISITOR_POPULATE_FIELDS)
        .lean()
      
      EventService.emitToProperty(propertyId, 'dashboard_message_update', {
        sessionId,
        message: messagePayload,
        session: fullyPopulatedSession,
      })

      // 🎯 FIX: Push live launcher updates to the minimized embed layout room immediately!
      if (senderType === 'operator' || senderType === 'ai') {
        const refreshedSession = await ChatSession.findById(sessionId).lean()
        if (refreshedSession && refreshedSession.visitorId) {
          EventService.emitToVisitor(
            refreshedSession.visitorId.toString(),
            'unread_count_sync',
            {
              sessionId,
              unreadCount: refreshedSession.unreadVisitor || 1,
            },
          )
        }
      }

     /* ****************************************
      * STEP 4: AI Routing & Triage (CORRECTED WITH VISITOR POPULATION)
      **************************************** */
      if (senderType === 'visitor') {
        if (session.aiEnabled && !session.assignedOperatorId) {
          const cleanText = (messageText || '').toLowerCase().trim()

          // 1️⃣ Check for explicit human matching patterns
          const isExplicitCommand =
            cleanText.includes('transfer') ||
            cleanText.includes('agent') ||
            cleanText.includes('human') ||
            cleanText.includes('operator') ||
            cleanText.includes('speak to someone')

          // 2️⃣ Check for casual confirmation phrases
          const isCasualConfirmation =
            ['yes', 'y', 'ok', 'okay', 'yeah', 'sure'].includes(cleanText)

          // Cache the initial status before any mutations take place
          const initialSessionStatus = session.status

          // 🎯 CRITICAL REFACTOR: An explicit command NO LONGER triggers an immediate transfer.
          const shouldTriggerTransfer = initialSessionStatus === 'waiting' && isCasualConfirmation

          /* --- SUB-ROUTE A: HUMAN TRANSFER REQUEST --- */
          if (shouldTriggerTransfer) {
            const propertyDoc = await Property.findById(session.propertyId)
              .select('accountId')
              .lean()

            const accountIdStr = propertyDoc?.accountId ? propertyDoc.accountId.toString() : ''
            const availableOperators = await getAvailableOperators(accountIdStr)

            if (
              availableOperators &&
              availableOperators.length > 0 &&
              availableOperators[0]
            ) {
              // --- SUCCESS: OPERATOR IS ONLINE AND AVAILABLE ---
              const targetOperator = availableOperators[0]
              const targetOperatorId = targetOperator._id.toString()

              const isAlreadyAssigned =
                (session.assignedOperatorId as any)?.toString() ===
                targetOperatorId

              session.aiEnabled = false
              session.aiEscalated = true
              session.status = 'active'
              session.assignedOperatorId = new Types.ObjectId(targetOperatorId)
              await session.save()

              if (!isAlreadyAssigned) {
                await Operator.updateOne(
                  { _id: targetOperatorId },
                  { $inc: { activeChatsCount: 1 } },
                )
              }

              const transferText =
                `Chat was transferred from AI to ${targetOperator.firstName || ''} ${targetOperator.lastName || ''}`.trim()
              const systemNotice = await createSystemMessage(
                sessionId,
                transferText,
              )

              const systemPayload = {
                ...(systemNotice.toObject
                  ? systemNotice.toObject()
                  : { ...systemNotice }),
                messageText: transferText,
              }

              // 🎯 CORRECTION: Fetch the newly assigned session with its visitor properties populated
              const assignedPopulated = await ChatSession.findById(sessionId)
                .populate('visitorId', VISITOR_POPULATE_FIELDS)
                .lean()

              EventService.emitToSession(sessionId, 'new_message', systemPayload)
              EventService.emitToSession(sessionId, 'session_status_changed', {
                sessionId,
                status: 'active',
                session: assignedPopulated, // 🎯 Sent to update panel dynamically
              })

              return messagePayload
            } else {
              // --- FALLBACK: NO OPERATORS AVAILABLE -> ROUTE TO UNASSIGNED QUEUE ---
              session.aiEnabled = true 
              session.aiEscalated = true
              session.status = 'queued' 
              await session.save()

              await QueueService.addToQueue(propertyId, sessionId)

              const fallbackReply =
                'I am ready to transfer you, but all of our agents are currently offline. Please hold, and an agent will reply as soon as possible. In the meantime, feel free to keep asking me questions!'

              const aiFallbackMsg = await sendMessage(
                sessionId,
                'ai',
                'ai_agent',
                fallbackReply,
                { messageType: 'text' as any, isFromAI: true },
              )

              EventService.emitToSession(sessionId, 'new_message', aiFallbackMsg)
              return messagePayload
            }
          }

          // --- STANDARD AI PROCESSING (If no active confirmation was validated) ---
          const historyMessages = (
            await Message.find({ sessionId })
              .select('+encryptedMessage')
              .sort({ createdAt: -1 })
              .limit(10)
              .lean()
          ).map((message) => ({
            ...message,
            messageText: message.encryptedMessage ? encryptionService.decrypt(message.encryptedMessage) : '',
          }))

          let aiResponse = await AIService.generateReply(
            messageText || '[Media Attachment File]',
            historyMessages,
          )

          // 🎯 FORCE ESCALATION GATEWAY: Intercept if they didn't confirm yet
          if (isExplicitCommand && initialSessionStatus !== 'waiting') {
            aiResponse = {
              reply: 'Would you like me to connect you with a live support agent? Please reply with "Yes" to confirm.',
              confidence: 1,
              shouldEscalate: true
            }
          }

          const aiMessage = await sendMessage(
            sessionId,
            'ai',
            'ai_agent',
            aiResponse.reply,
            {
              messageType: 'text' as any,
              isFromAI: true,
            },
          )

          EventService.emitToSession(sessionId, 'new_message', aiMessage)

          if (aiResponse.shouldEscalate) {
            session.status = 'waiting'
            await session.save()
          } else if (initialSessionStatus === 'waiting') {
            session.status = 'active'
            await session.save()
          }

          // 🎯 CORRECTION: Fetch latest session snapshot with populated visitor data right after database changes
          const freshPopulatedSession = await ChatSession.findById(sessionId)
            .populate('visitorId', VISITOR_POPULATE_FIELDS)
            .lean()

          EventService.emitToProperty(propertyId, 'dashboard_message_update', {
            sessionId,
            message: aiMessage,
            session: freshPopulatedSession, // 🎯 Overrides unpopulated state with full tracking profile
          })

          EventService.emitToProperty(propertyId, 'dashboard_refresh_request', {})

          return messagePayload
        }
      }

      /* ****************************************
      * STEP 5: Live Auto-assignment Fallback Checks
      **************************************** */
      session = await ChatSession.findById(sessionId)
      if (!session) {
        throw new AppError('Chat session context vanished.', 404)
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
