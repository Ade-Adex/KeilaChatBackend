

// /src/services/socket.service.ts


import { Server } from 'socket.io'
import type { Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'
import ChatSession from '../models/ChatSession.js'
import Message from '../models/Message.js'
import Property from '../models/Property.js'
import { normalizeDomain } from '../utils/domain.utils.js'

export class SocketService {
  private io: Server

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          callback(null, origin || '*')
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    })

    this.initializeEvents()
  }

  private initializeEvents(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(
        '\x1b[36m%s\x1b[0m',
        `🔌 [WEBSOCKET] Client connected: ${socket.id}`,
      )

      // 1. OPERATOR DASHBOARD ROUTING MATRIX: Join strict property channel lists
      socket.on('join_property_dashboard', (data: { propertyId: string }) => {
        if (!data.propertyId) return
        const roomName = `property:dashboard:${data.propertyId}`
        socket.join(roomName)
        console.log(`💼 Operator Dashboard connected to room: ${roomName}`)
      })

      // 2. SECURE CHAT SESSION ISOLATION JOIN PIPELINE
      socket.on(
        'join_chat_session',
        async (data: {
          sessionId: string
          clientType: 'visitor' | 'operator'
          senderName?: string
        }) => {
          if (!data.sessionId) return

          const session = await ChatSession.findById(data.sessionId)
          if (!session) {
            socket.emit('error', { message: 'Chat session record not found.' })
            return
          }

          const property = await Property.findById(session.propertyId).lean()
          if (!property) {
            socket.emit('error', {
              message:
                'Associated site configuration tracking mapping missing.',
            })
            return
          }

          // Domain Protection Gate for Widget instances
          if (data.clientType === 'visitor') {
            const origin =
              socket.handshake.headers.origin ||
              socket.handshake.headers.referer
            const requestHostname = normalizeDomain(origin)
            const registeredDomain = normalizeDomain(property.domain)

            if (requestHostname !== registeredDomain) {
              socket.emit('error', {
                message:
                  'Unauthorized execution: Site Origin token validation failure.',
              })
              return
            }
          }

          const roomName = `session:${data.sessionId}`
          socket.join(roomName)
          console.log(
            `💬 Client (${data.clientType}) joined explicit session workspace room: ${roomName}`,
          )

          // SYSTEM ALERT EVENT: Inform both participants that a channel sync has occurred
          const connectionName =
            data.senderName ||
            (data.clientType === 'operator' ? 'Support Agent' : 'Visitor')

          const systemNotification = {
            _id: `sys-${Date.now()}`,
            sessionId: data.sessionId,
            senderType: 'system' as const,
            senderId: 'system',
            messageText: `${connectionName} joined the chat workspace context sync channel.`,
            createdAt: new Date(),
            isRead: true,
          }

          // Send confirmation only to other clients already connected to the isolated stream
          // socket.to(roomName).emit('presence_notification', systemNotification)
          this.io.to(roomName).emit('presence_notification', systemNotification)
        },
      )

      // 3. TYPING INDICATOR PIPELINE
      // socket.on(
      //   'typing',
      //   (data: {
      //     sessionId: string
      //     senderName: string
      //     isTyping: boolean
      //   }) => {
      //     if (!data.sessionId) return
      //     const roomName = `session:${data.sessionId}`
      //     socket.to(roomName).emit('user_typing', {
      //       senderName: data.senderName,
      //       isTyping: data.isTyping,
      //     })
      //   },
      // )


      socket.on(
        'typing',
        (data: {
          sessionId: string
          senderName: string
          senderType: 'visitor' | 'operator'
          isTyping: boolean
        }) => {
          if (!data.sessionId) return

          const roomName = `session:${data.sessionId}`

          socket.to(roomName).emit('user_typing', {
            senderName: data.senderName,
            senderType: data.senderType,
            isTyping: data.isTyping,
          })
        },
      )

      // 4. REAL-TIME MULTI-TENANT MESSAGE PROCESSING PIPELINE
      socket.on(
        'send_message',
        async (data: {
          sessionId: string
          propertyId: string
          senderType: 'visitor' | 'operator'
          senderId: string
          senderName: string
          messageText: string
        }) => {
          try {
            const session = await ChatSession.findById(data.sessionId)

            if (!session || session.status === 'closed') {
              socket.emit('error', {
                message: 'This session is closed. No further messages allowed.',
              })
              return
            }

            // Strict Security Check: Verify that the message property coordinates match the session property context
            if (session.propertyId.toString() !== data.propertyId.toString()) {
              socket.emit('error', {
                message: 'Cross-site messaging packet interception blocked.',
              })
              return
            }

            const nameToSave =
              data.senderName ||
              (data.senderType === 'operator' ? 'Support' : 'Visitor')

            const savedMessage = await Message.create({
              sessionId: data.sessionId,
              senderType: data.senderType,
              senderId: data.senderId,
              senderName: nameToSave,
              messageText: data.messageText,
              createdAt: new Date(),
              isRead: false,
            })

            const roomName = `session:${data.sessionId}`

            // Deliver strictly to matching chat socket loop paths
            this.io.to(roomName).emit('new_message', savedMessage)

            // If a visitor sent the message, alert the property dashboard operator queue container
            if (data.senderType === 'visitor') {
              const dashboardRoom = `property:dashboard:${data.propertyId}`
              this.io.to(dashboardRoom).emit('incoming_visitor_alert', {
                sessionId: data.sessionId,
                messageText: data.messageText,
              })
            }
          } catch (error) {
            console.error(
              'Core multi-tenant pipeline message processing fault:',
              error,
            )
            socket.emit('message_error', {
              message: 'Failed to process message transmission.',
            })
          }
        },
      )

      // 5. DISCONNECT CLEANUP
      socket.on('disconnect', () => {
        console.log(
          '\x1b[33m%s\x1b[0m',
          `❌ [WEBSOCKET] Client disconnected: ${socket.id}`,
        )
      })
    })
  }

  public getIO(): Server {
    return this.io
  }
}