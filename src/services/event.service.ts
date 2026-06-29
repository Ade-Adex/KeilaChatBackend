// /src/services/event.service.ts

//  You'll use it for: operator joined, operator left, visitor typing, operator typing, chat ended, chat transferred, new message, notifications, read receipts, delivered receipts

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

  /*
   ****************************************
   * NEW
   ****************************************
   */
  static emitToOperator(operatorId: string, event: string, data: any) {
    this.io.to(`operator:${operatorId}`).emit(event, data)
  }

  /*
   ****************************************
   * NEW
   ****************************************
   */
  static emitToVisitor(visitorId: string, event: string, data: any) {
    this.io.to(`visitor:${visitorId}`).emit(event, data)
  }
}