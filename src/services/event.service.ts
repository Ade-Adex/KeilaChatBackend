// /src/services/event.service.ts

import { Server } from 'socket.io'

export class EventService {
  static io: Server

  static init(io: Server) {
    this.io = io
  }

  static emitToSession(sessionId: string, event: string, data: any) {
    this.io.to(`session:${sessionId}`).emit(event, data)
  }

  static emitToProperty(propertyId: string, event: string, data: any) {
    this.io.to(`property:dashboard:${propertyId}`).emit(event, data)
  }
}
