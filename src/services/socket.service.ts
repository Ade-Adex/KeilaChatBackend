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

            const messages = await Message.find({ sessionId: data.sessionId })
              .sort({ createdAt: 1 })
              .lean()

            socket.emit('chat_history', messages)

            // 🎯 DELIBERATE SAFETY CHECK: Only issue an automated read receipt on room entrance
            // if there are actually active unseen elements, preventing blank race loops.
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
            // 🎯 FIX: DO NOT automatically call markAllSeenInSession here.
            // Let ClientChatWrapper handle triggering read status explicitly via 'mark_session_seen' when open === true.

            // However, if the visitor is online and connecting, any pending operator message can safely be marked delivered.
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
          const message = await MessagePipeline.processMessage(data)

          EventService.emitToSession(data.sessionId, 'new_message', message)

          const session = await ChatSession.findById(data.sessionId).lean()
          if (session && session.propertyId) {
            const propertyRoom = `property:dashboard:${session.propertyId.toString()}`

            this.io.to(propertyRoom).emit('dashboard_message_update', {
              sessionId: data.sessionId,
              message: message,
            })
          }

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