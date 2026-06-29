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

import { operatorJoined } from './message.service.js'

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

            console.log('JOIN DASHBOARD', propertyId, operatorId)

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
      /* JOIN CHAT SESSION (CORRECTED)                       */
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
       * TYPING
       ****************************************
       */
      socket.on('typing', (data: TypingPayload) => {
        try {
          if (!data.sessionId) return

          socket.to(`session:${data.sessionId}`).emit('user_typing', {
            senderName: data.senderName,
            isTyping: data.isTyping,
          })
        } catch (error) {
          logger.error(error, 'typing failed')
        }
      })

      /* -------------------------------------------------- */
      /* SEND MESSAGE (CORRECTED)                           */
      /* -------------------------------------------------- */
      socket.on('send_message', async (data: SendMessagePayload) => {
        try {
          // Step 1: Process DB persistence, run pipelines, and execute auto-assignments
          const message = await MessagePipeline.processMessage(data)

          // Step 2: Cleanly broadcast to the focused active chat viewport room
          EventService.emitToSession(data.sessionId, 'new_message', message)

          // Step 3: Fetch structural details to notify dashboards monitoring this property
          const session = await ChatSession.findById(data.sessionId).lean()
          if (session && session.propertyId) {
            const propertyRoom = `property:dashboard:${session.propertyId.toString()}`

            // Broadcast the target dashboard event so components update without a refresh
            this.io.to(propertyRoom).emit('dashboard_message_update', {
              sessionId: data.sessionId,
              message: message,
            })
          }

          // Step 4: Confirm delivery to sender instance
          socket.emit('message_delivered', {
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
      /* DISCONNECT STATE (CORRECTED)                       */
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
