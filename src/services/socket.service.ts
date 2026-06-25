// /src/services/socket.service.ts

import { Server } from 'socket.io'
import type { Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'

import { MessagePipeline } from './messagePipeline.service.js'
import { EventService } from './event.service.js'
import { PresenceService } from './presence.service.js'
import logger from '../bootstrap/logger.js'

export class SocketService {
  private io: Server

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    })

    EventService.init(this.io)
    this.initializeEvents()
  }

  private initializeEvents(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`🔌 Client connected: ${socket.id}`)

      /**
       * JOIN PROPERTY DASHBOARD
       */
      socket.on('join_property_dashboard', ({ propertyId, operatorId }) => {
        if (!propertyId) return

        socket.join(`property:dashboard:${propertyId}`)

        if (operatorId) {
          PresenceService.setOperatorOnline(operatorId, socket.id)
        }

        logger.info(`💼 Joined dashboard: ${propertyId}`)
      })

      /**
       * JOIN CHAT SESSION
       */
      socket.on('join_chat_session', async (data) => {
        if (!data?.sessionId) return

        const room = `session:${data.sessionId}`
        socket.join(room)

        if (data.visitorId) {
          await PresenceService.setVisitorActive(data.visitorId, data.sessionId)
        }

        socket.to(room).emit('presence_notification', {
          message: `${data.clientType} joined chat`,
        })

        logger.info(`💬 Joined session: ${data.sessionId} (${data.clientType})`)
      })

      /**
       * TYPING EVENT
       */
      socket.on('typing', (data) => {
        if (!data?.sessionId) return

        socket.to(`session:${data.sessionId}`).emit('user_typing', {
          senderName: data.senderName,
          isTyping: data.isTyping,
        })
      })

      /**
       * MESSAGE PIPELINE
       */
      socket.on('send_message', async (data) => {
        try {
          const message = await MessagePipeline.processMessage(data)

          EventService.emitToSession(data.sessionId, 'new_message', message)

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

      /**
       * NOTIFICATION ALERT
       */
      socket.on('join_notifications', (data: { propertyId: string }) => {
        if (!data.propertyId) return

        socket.join(`property:dashboard:${data.propertyId}`)

        logger.info(`🔔 Joined notification channel: ${data.propertyId}`)
      })

      /**
       * DISCONNECT
       */
      socket.on('disconnect', () => {
        logger.info(`❌ Client disconnected: ${socket.id}`)
      })
    })
  }

  public getIO(): Server {
    return this.io
  }
}
