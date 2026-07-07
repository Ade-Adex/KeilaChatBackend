// /src/services/socket.service.ts

import { Server } from 'socket.io'
import type { Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'

import { MessagePipeline } from './messagePipeline.service.js'
import { EventService } from './event.service.js'
import { PresenceService } from './presence.service.js'

import Operator from '../models/Operator.js'
import ChatSession from '../models/ChatSession.js'
import Message from '../models/Message.js'

import {
  operatorJoined,
  markDelivered,
  markSeen,
  markAllDelivered,
  markAllSeenInSession,
} from './message.service.js'

import type {
  JoinChatPayload,
  TypingPayload,
  SendMessagePayload,
  JoinDashboardPayload,
  NotificationPayload,
} from '../types/socket.types.js'

import logger from '../bootstrap/logger.js'
import { ENV } from '../config/env.js'

export class SocketService {
  private io: Server

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: ENV.BASE_URL,
        credentials: true,
        methods: ['GET', 'POST'],
      },
    })

    EventService.init(this.io)
    this.initializeEvents()
  }

  private initializeEvents(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`🔌 Connected: ${socket.id}`)

      /*
       ****************************************
       * JOIN PROPERTY DASHBOARD
       ****************************************
       */
      socket.on(
        'join_property_dashboard',
        async ({ propertyId, operatorId }: JoinDashboardPayload) => {
          try {
            if (!propertyId) return

            socket.join(`property:dashboard:${propertyId}`)

            if (operatorId) {
              socket.join(`operator:${operatorId}`)
              socket.data.operatorId = operatorId

              await PresenceService.setOperatorOnline(operatorId, socket.id)
            }

            logger.info(`📊 Dashboard joined: ${propertyId}`)
          } catch (error) {
            logger.error(error, 'join_property_dashboard failed')
          }
        },
      )

      /* -------------------------------------------------- */
      /* JOIN CHAT SESSION                                  */
      /* -------------------------------------------------- */
      socket.on('join_chat_session', async (data: JoinChatPayload) => {
        try {
          if (!data.sessionId) return

          const room = `session:${data.sessionId}`
          socket.join(room)

          if (data.visitorId) {
            socket.join(`visitor:${data.visitorId}`)
            socket.data.visitorId = data.visitorId
            await PresenceService.setVisitorActive(
              data.visitorId,
              data.sessionId,
            )
          }

          const session = await ChatSession.findById(data.sessionId)

          if (data.clientType === 'operator' && data.operatorId && session) {
            socket.join(`property:dashboard:${session.propertyId.toString()}`)
            socket.join(`operator:${data.operatorId}`)
            socket.data.operatorId = data.operatorId

            await PresenceService.setOperatorOnline(data.operatorId, socket.id)

            // 🛡️ ONLY intercept if AI is off, or the conversation was explicitly escalated/queued for human eyes.
            const isReadyForHuman =
              !session.aiEnabled ||
              session.aiEscalated ||
              session.status === 'queued'

            if (
              isReadyForHuman &&
              (session.status === 'queued' ||
                session.status === 'waiting' ||
                !session.assignedOperatorId)
            ) {
              await ChatSession.findByIdAndUpdate(data.sessionId, {
                status: 'active',
                assignedOperatorId: data.operatorId,
              })

              // Notify the visitor widget and refresh the dashboard panels globally
              this.io.to(room).emit('session_status_changed', {
                sessionId: data.sessionId,
                status: 'active',
              })
              this.io
                .to(`property:dashboard:${session.propertyId}`)
                .emit('dashboard_refresh_request')
            }

            const operatorProfile = await Operator.findById(data.operatorId)
              .select('firstName avatar')
              .lean()
            if (operatorProfile) {
              this.io.to(room).emit('operator_joined', {
                operatorId: data.operatorId,
                name: operatorProfile.firstName?.trim() || 'Support Agent',
                avatar: operatorProfile.avatar || '',
              })
            }

            const messages = await Message.find({ sessionId: data.sessionId })
              .sort({ createdAt: 1 })
              .lean()

            // 🔒 Map encryptionIv into iv so the frontend can read decrypted message history cleanly
            const mappedHistory = messages.map((msg) => ({
              ...msg,
              iv: msg.encryptionIv,
            }))

            socket.emit('chat_history', mappedHistory)

            // socket.emit('chat_history', messages)

            if (session.unreadOperator > 0) {
              await markAllSeenInSession(
                data.sessionId,
                'visitor',
                data.operatorId,
              )
              this.io.to(room).emit('messages_seen', {
                sessionId: data.sessionId,
                reader: 'operator',
              })

              this.io
                .to(`property:dashboard:${session.propertyId}`)
                .emit('dashboard_unread_cleared', { sessionId: data.sessionId })
            }
          }

          if (data.clientType === 'visitor' && session) {
            // Let ClientChatWrapper handle triggering read status explicitly via 'mark_session_seen' when open === true.
            await markAllDelivered(data.sessionId, 'operator')
            await markAllDelivered(data.sessionId, 'ai')

            this.io.to(room).emit('messages_delivered_bulk', {
              sessionId: data.sessionId,
              senderType: 'operator',
            })
          }

          socket.to(room).emit('presence_notification', {
            message: `${data.clientType} joined chat`,
          })

          logger.info(`💬 Joined session ${data.sessionId}`)
        } catch (error) {
          logger.error(error, 'join_chat_session failed')
        }
      })

      /*
       ****************************************
       * TYPING EVENT PIPELINE
       ****************************************
       */
      socket.on('typing', (data: TypingPayload) => {
        try {
          if (!data.sessionId) return

          const calculatedActor =
            data.senderName?.toLowerCase() === 'visitor'
              ? 'visitor'
              : 'operator'

          socket.to(`session:${data.sessionId}`).emit('user_typing', {
            sessionId: data.sessionId,
            senderName: data.senderName,
            isTyping: data.isTyping,
            actor: calculatedActor,
          })
        } catch (error) {
          logger.error(error, 'Real-time typing event routing pipeline crashed')
        }
      })

      /* -------------------------------------------------- */
      /* SEND MESSAGE                                       */
      /* -------------------------------------------------- */
      socket.on('send_message', async (data: SendMessagePayload) => {
        try {
          // MessagePipeline already handles global room emissions and dashboard sync updates internally!
          const message = await MessagePipeline.processMessage(data)

          // Only send the lightweight operational acknowledgment back to the source socket
          socket.emit('message_ack', {
            messageId: message._id,
            sessionId: data.sessionId,
          })
        } catch (error) {
          logger.error(error, 'Socket message processing failed')
          socket.emit('message_error', { message: 'Message processing failed' })
        }
      })

      /*
       ****************************************
       * 🎯 NEW: MESSAGE DELIVERED RECEIPT LISTENER
       ****************************************
       */
      socket.on(
        'message_delivered',
        async (data: { messageId: string; sessionId: string }) => {
          try {
            if (!data.messageId) return
            const updatedMessage = await markDelivered(data.messageId)

            if (updatedMessage) {
              this.io
                .to(`session:${data.sessionId}`)
                .emit('message_status_updated', {
                  messageId: data.messageId,
                  sessionId: data.sessionId,
                  status: 'delivered',
                })
            }
          } catch (error) {
            logger.error(error, 'Error setting delivery confirmation state')
          }
        },
      )

      /*
       ****************************************
       * 🔒 CRYPTOGRAPHIC PUBLIC KEY DISTRIBUTION EXCHANGE
       ****************************************
       */
      socket.on(
        'share_public_key',
        (data: {
          sessionId: string
          publicKey: any
          clientType: 'visitor' | 'operator'
        }) => {
          try {
            if (!data.sessionId) return
            // Forward the public key configuration down to the opposite participant room context
            socket.to(`session:${data.sessionId}`).emit('public_key_received', {
              publicKey: data.publicKey,
              clientType: data.clientType,
            })
            logger.info(
              `🔑 Key distributed across session room: ${data.sessionId} via ${data.clientType}`,
            )
          } catch (error) {
            logger.error(
              error,
              'Failed to proxy cryptographic handshake metrics securely',
            )
          }
        },
      )

      /*
       ****************************************
       * 🎯 NEW: BULK WINDOW SEEN RECEIPT LISTENER
       ****************************************
       */
      socket.on(
        'mark_session_seen',
        async (data: {
          sessionId: string
          clientType: 'visitor' | 'operator'
          operatorId?: string
        }) => {
          try {
            if (!data.sessionId) return

            // If operator views it, visitor's messages are read. If visitor views it, operator/ai messages are read.
            const targetSenderType =
              data.clientType === 'operator' ? 'visitor' : 'operator'

            await markAllSeenInSession(
              data.sessionId,
              targetSenderType,
              data.operatorId,
            )
            if (targetSenderType === 'operator') {
              await markAllSeenInSession(data.sessionId, 'ai', data.operatorId)
            }

            const session = await ChatSession.findById(data.sessionId).lean()

            // Broadcast state shift down to open windows
            this.io.to(`session:${data.sessionId}`).emit('messages_seen', {
              sessionId: data.sessionId,
              reader: data.clientType,
            })

            // Sync dashboard sidebar unread badge removals
            if (session && data.clientType === 'operator') {
              this.io
                .to(`property:dashboard:${session.propertyId.toString()}`)
                .emit('dashboard_unread_cleared', {
                  sessionId: data.sessionId,
                })
            }
          } catch (error) {
            logger.error(
              error,
              'Failed to map bulk session seen confirmation loops',
            )
          }
        },
      )

      /*
       ****************************************
       * JOIN NOTIFICATIONS
       ****************************************
       */
      socket.on('join_notifications', ({ propertyId }: NotificationPayload) => {
        if (!propertyId) return

        socket.join(`property:dashboard:${propertyId}`)
        logger.info(`🔔 Notification room joined ${propertyId}`)
      })

      /*
       ****************************************
       * HEARTBEAT
       ****************************************
       */
      socket.on('ping_server', () => {
        socket.emit('pong_server')
      })

      /*
       ****************************************
       * 🎯 NEW: CHAT TRANSFER AGENT PIPELINE
       ****************************************
       */
      socket.on(
        'transfer_chat_session',
        async (data: { sessionId: string; targetOperatorId: string }) => {
          try {
            if (!data.sessionId || !data.targetOperatorId) return

            // 1. Fetch the incoming new assigned operator profile details
            const newOperator = await Operator.findById(data.targetOperatorId)
              .select('firstName lastName avatar')
              .lean()
            if (!newOperator) return

            // 2. Update the session assignment on the database layer
            const updatedSession = await ChatSession.findByIdAndUpdate(
              data.sessionId,
              {
                assignedOperatorId: data.targetOperatorId,
                status: 'active',
              },
              { new: true },
            )

            if (!updatedSession) return

            const room = `session:${data.sessionId}`
            const transferText =
              `Chat was transferred to ${newOperator.firstName} ${newOperator.lastName || ''}`.trim()

            // 🎯 3. SAVE THE SYSTEM NOTICE PERMANENTLY IN THE DATABASE
            // Adjust model name "Message" matching your actual database schema
            const systemMessage = await Message.create({
              sessionId: data.sessionId,
              senderType: 'system',
              senderId: 'system',
              messageText: transferText,
              messageType: 'text',
              status: 'seen',
              createdAt: new Date(),
            })

            // Turn into a plain object so we can send it through the pipeline cleanly
            const broadcastSystemMessage = systemMessage.toObject
              ? systemMessage.toObject()
              : { ...systemMessage }

            // 4. Broadcast the plain object down to the rooms
            this.io.to(room).emit('new_message', broadcastSystemMessage)

            // 5. Tell the new operator's specific layout stream to join the session
            this.io
              .to(`operator:${data.targetOperatorId}`)
              .emit('chat_assigned', {
                sessionId: data.sessionId,
                propertyId: updatedSession.propertyId,
                operatorId: data.targetOperatorId,
                operator: newOperator,
              })

            // 6. Notify the property dashboards across all operators to dynamically reposition sidebars
            this.io
              .to(`property:dashboard:${updatedSession.propertyId.toString()}`)
              .emit('dashboard_refresh_request')
          } catch (error) {
            logger.error(
              error,
              'Failed to complete chat session transfer execution routing',
            )
          }
        },
      )
      /* -------------------------------------------------- */
      /* DISCONNECT STATE                                   */
      /* -------------------------------------------------- */
      socket.on('disconnect', async () => {
        try {
          const operatorId = socket.data.operatorId
          const visitorId = socket.data.visitorId

          if (operatorId) {
            await PresenceService.setOperatorOffline(operatorId)
          }

          if (visitorId) {
            await PresenceService.removeVisitor(visitorId)
          }

          logger.info(`❌ Disconnected: ${socket.id}`)
        } catch (error) {
          logger.error(error, 'Disconnect failed')
        }
      })
    })
  }

  public getIO(): Server {
    return this.io
  }
}