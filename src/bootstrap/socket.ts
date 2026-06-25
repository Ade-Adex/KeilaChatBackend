// /src/bootstrap/socket.ts

import type { Server as HTTPServer } from 'http'

import { SocketService } from '../services/socket.service.js'

export const bootstrapSocket = (server: HTTPServer) => {
  const socketService = new SocketService(server)

  console.log('\x1b[32m%s\x1b[0m', '✅ Socket.IO bootstrap completed.')

  return socketService
}
