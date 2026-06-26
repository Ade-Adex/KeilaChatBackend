// /src/services/socket.service.ts

import { Server } from 'socket.io'
import type { Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'

import { MessagePipeline } from './messagePipeline.service.js'
import { EventService } from './event.service.js'
import { PresenceService } from './presence.service.js'

import { operatorJoined, operatorLeft } from './message.service.js'

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
      // cors: {
      //   origin: '*',
      //   methods: ['GET', 'POST'],
      //   credentials: true,
      // },
      cors: {
        origin: ENV.BASE_URL,
        credentials: true,
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
          if (!propertyId) return

          socket.join(`property:dashboard:${propertyId}`)

          if (operatorId) {
            await PresenceService.setOperatorOnline(operatorId, socket.id)
          }

          logger.info(`📊 Dashboard joined: ${propertyId}`)
        },
      )

      /*
       ****************************************
       * JOIN CHAT SESSION
       ****************************************
       */
      socket.on('join_chat_session', async (data: JoinChatPayload) => {
        if (!data.sessionId) return

        const room = `session:${data.sessionId}`

        socket.join(room)

        if (data.visitorId) {
          await PresenceService.setVisitorActive(data.visitorId, data.sessionId)
        }

        if (data.clientType === 'operator' && data.operatorId) {
          await operatorJoined(data.sessionId, data.operatorId)
        }

        socket.to(room).emit('presence_notification', {
          message: `${data.clientType} joined chat`,
        })

        logger.info(`💬 Joined session ${data.sessionId}`)
      })

      /*
       ****************************************
       * TYPING
       ****************************************
       */
      socket.on('typing', (data: TypingPayload) => {
        if (!data.sessionId) return

        socket.to(`session:${data.sessionId}`).emit('user_typing', {
          senderName: data.senderName,
          isTyping: data.isTyping,
        })
      })

      /*
       ****************************************
       * SEND MESSAGE
       ****************************************
       */
      socket.on('send_message', async (data: SendMessagePayload) => {
        try {
          const message = await MessagePipeline.processMessage(data)

          EventService.emitToSession(data.sessionId, 'new_message', message)

          socket.emit('message_delivered', {
            messageId: message._id,
            sessionId: data.sessionId,
          })

          if (data.senderType === 'visitor') {
            EventService.emitToProperty(
              data.propertyId,
              'incoming_visitor_alert',
              {
                sessionId: data.sessionId,
                messageText: data.messageText,
              },
            )
          }
        } catch (error) {
          logger.error(error, 'Socket message processing failed')

          socket.emit('message_error', {
            message: 'Message processing failed',
          })
        }
      })

      /*
       ****************************************
       * JOIN NOTIFICATION ROOM
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
       * DISCONNECT
       ****************************************
       */
      socket.on('disconnect', async () => {
        try {
          for (const room of socket.rooms) {
            if (room.startsWith('session:')) {
              const sessionId = room.replace('session:', '')

              await operatorLeft(sessionId, 'Operator')
            }
          }

          logger.info(`❌ Disconnected: ${socket.id}`)
        } catch (error) {
          logger.error(error, 'Disconnect handler failed')
        }
      })
    })
  }

  public getIO(): Server {
    return this.io
  }
}
