// /src/services/socket.service.ts

import { Server } from 'socket.io'
import type { Socket } from 'socket.io'
import http from 'http'
import ChatSession from '../models/ChatSession.js'
import Message from '../models/Message.js'
import Operator from '../models/Operator.js'

export class SocketService {
  private io: Server

  constructor(server: http.Server) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
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

      // 1. OPERATOR ROOM: Operators join a room tied to their property dashboard
      socket.on('join_property_dashboard', (data: { propertyId: string }) => {
        const roomName = `property:dashboard:${data.propertyId}`
        socket.join(roomName)
        console.log(`💼 Operator Dashboard connected to room: ${roomName}`)
      })

      // 2. CHAT SESSION ROOM: Both Visitors and Operators join this specific conversation tunnel
      socket.on('join_chat_session', async (data: { sessionId: string }) => {
        const roomName = `session:${data.sessionId}`
        socket.join(roomName)
        console.log(`💬 Client joined chat workspace room: ${roomName}`)
      })

      // 3. TYPING INDICATOR PIPELINE
      socket.on(
        'typing',
        (data: {
          sessionId: string
          senderName: string
          isTyping: boolean
        }) => {
          const roomName = `session:${data.sessionId}`
          // Broadcast the typing status to everyone else in that specific session room
          socket.to(roomName).emit('user_typing', {
            senderName: data.senderName,
            isTyping: data.isTyping,
          })
        },
      )

      // 4. INCOMING REAL-TIME MESSAGE PIPELINE
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

            // Broadcast the saved message payload instantly to everyone in that session room
            this.io.to(roomName).emit('new_message', savedMessage)

            // If a visitor sent the message, alert the property dashboard operators
            if (data.senderType === 'visitor') {
              const dashboardRoom = `property:dashboard:${data.propertyId}`
              this.io.to(dashboardRoom).emit('incoming_visitor_alert', {
                sessionId: data.sessionId,
                messageText: data.messageText,
              })
            }
          } catch (error) {
            console.error(
              '🟥 Error processing real-time message stream:',
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

  // Helper utility method to expose the raw emitter across controllers if needed
  public getIO(): Server {
    return this.io
  }
}
