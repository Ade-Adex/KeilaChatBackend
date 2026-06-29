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

            console.log(
              'JOIN DASHBOARD',
              propertyId,
              operatorId,
            )

            socket.join(`property:dashboard:${propertyId}`)

            if (operatorId) {
              socket.join(`operator:${operatorId}`)

              socket.data.operatorId = operatorId

              await PresenceService.setOperatorOnline(
                operatorId,
                socket.id,
              )
            }

            logger.info(
              `📊 Dashboard joined: ${propertyId}`,
            )
          } catch (error) {
            logger.error(
              error,
              'join_property_dashboard failed',
            )
          }
        },
      )

      /*
       ****************************************
       * JOIN CHAT SESSION
       ****************************************
       */
      socket.on(
        'join_chat_session',
        async (data: JoinChatPayload) => {
          try {
            if (!data.sessionId) return

            console.log(
              'JOIN CHAT',
              data.clientType,
              data.sessionId,
            )

            const room = `session:${data.sessionId}`

            socket.join(room)

            /*
             ************************************
             * VISITOR ROOM
             ************************************
             */
            if (data.visitorId) {
              socket.join(
                `visitor:${data.visitorId}`,
              )

              await PresenceService.setVisitorActive(
                data.visitorId,
                data.sessionId,
              )
            }

            /*
             ************************************
             * OPERATOR ROOM
             ************************************
             */
            const session =
              await ChatSession.findById(
                data.sessionId,
              )

            if (
              data.clientType === 'operator' &&
              data.operatorId &&
              session
            ) {
              socket.join(
                `property:dashboard:${session.propertyId.toString()}`,
              )

              socket.join(
                `operator:${data.operatorId}`,
              )

              socket.data.operatorId =
                data.operatorId

              await PresenceService.setOperatorOnline(
                data.operatorId,
                socket.id,
              )

              /*
               ************************************
               * SEND CHAT HISTORY
               ************************************
               */
              const messages =
                await Message.find({
                  sessionId: data.sessionId,
                })
                  .sort({
                    createdAt: 1,
                  })
                  .lean()

              socket.emit(
                'chat_history',
                messages,
              )

              /*
               ************************************
               * OPERATOR JOINED
               ************************************
               */
              const operator =
                await Operator.findById(
                  data.operatorId,
                )

              if (
                operator &&
                session.assignedOperatorId?.toString() ===
                  data.operatorId
              ) {
                const systemMessage =
                  await operatorJoined(
                    data.sessionId,
                    `${operator.firstName} ${operator.lastName}`,
                  )

                EventService.emitToSession(
                  data.sessionId,
                  'new_message',
                  systemMessage,
                )
              }
            }

            socket.to(room).emit(
              'presence_notification',
              {
                message: `${data.clientType} joined chat`,
              },
            )

            logger.info(
              `💬 Joined session ${data.sessionId}`,
            )
          } catch (error) {
            logger.error(
              error,
              'join_chat_session failed',
            )
          }
        },
      )

      /*
       ****************************************
       * TYPING
       ****************************************
       */
      socket.on(
        'typing',
        (data: TypingPayload) => {
          try {
            if (!data.sessionId) return

            socket
              .to(
                `session:${data.sessionId}`,
              )
              .emit('user_typing', {
                senderName:
                  data.senderName,
                isTyping:
                  data.isTyping,
              })
          } catch (error) {
            logger.error(
              error,
              'typing failed',
            )
          }
        },
      )

      /*
       ****************************************
       * SEND MESSAGE
       ****************************************
       */
      socket.on(
        'send_message',
        async (
          data: SendMessagePayload,
        ) => {
          try {
            console.log(
              'SEND MESSAGE',
              data.senderType,
              data.sessionId,
              data.messageText,
            )

            const message =
              await MessagePipeline.processMessage(
                data,
              )

            /*
             ************************************
             * SESSION ROOM
             ************************************
             */
            EventService.emitToSession(
              data.sessionId,
              'new_message',
              message,
            )

            /*
             ************************************
             * VISITOR ALERT
             ************************************
             */
            if (
              data.senderType ===
              'visitor'
            ) {
              EventService.emitToProperty(
                data.propertyId,
                'incoming_visitor_alert',
                {
                  sessionId:
                    data.sessionId,
                  messageText:
                    data.messageText,
                },
              )

              EventService.emitToProperty(
                data.propertyId,
                'dashboard_message_update',
                {
                  sessionId:
                    data.sessionId,
                  message,
                },
              )
            }

            /*
             ************************************
             * DELIVERY ACK
             ************************************
             */
            socket.emit(
              'message_delivered',
              {
                messageId:
                  message._id,
                sessionId:
                  data.sessionId,
              },
            )
          } catch (error) {
            logger.error(
              error,
              'Socket message processing failed',
            )

            socket.emit(
              'message_error',
              {
                message:
                  'Message processing failed',
              },
            )
          }
        },
      )

      /*
       ****************************************
       * JOIN NOTIFICATIONS
       ****************************************
       */
      socket.on(
        'join_notifications',
        ({
          propertyId,
        }: NotificationPayload) => {
          if (!propertyId) return

          socket.join(
            `property:dashboard:${propertyId}`,
          )

          logger.info(
            `🔔 Notification room joined ${propertyId}`,
          )
        },
      )

      /*
       ****************************************
       * HEARTBEAT
       ****************************************
       */
      socket.on(
        'ping_server',
        () => {
          socket.emit(
            'pong_server',
          )
        },
      )

      /*
       ****************************************
       * DISCONNECT
       ****************************************
       */
      socket.on(
        'disconnect',
        async () => {
          try {
            const operatorId =
              socket.data.operatorId

            if (operatorId) {
              await PresenceService.setOperatorOffline(
                operatorId,
              )
            }

            logger.info(
              `❌ Disconnected: ${socket.id}`,
            )
          } catch (error) {
            logger.error(
              error,
              'Disconnect failed',
            )
          }
        },
      )
    })
  }

  public getIO(): Server {
    return this.io
  }
}