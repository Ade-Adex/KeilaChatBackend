// /src/server.ts

import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import http from 'http'
import cors from 'cors'

import connectDB from './config/db.js'
import appRouter from './routes/index.js'
import { globalErrorHandler } from './config/errorHandler.js'
import { SocketService } from './services/socket.service.js'

const app = express()
const server = http.createServer(app)

connectDB()

// Global Middlewares
// Replace your existing cors config with this:
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ['https://keila-chat.vercel.app', 'http://localhost:3000'].includes(origin)) {
      callback(null, true)
    } else {
      callback(null, true)
    }
  },
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  next();
});

app.use(express.json())

// Main Modular Routes Mount Point
app.use('/api/v1', appRouter)

const socketService = new SocketService(server)

app.set('socketService', socketService)

app.use(globalErrorHandler)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  const mode = process.env.NODE_ENV || 'development'
  console.log(
    '\x1b[35m%s\x1b[0m',
    `🖥️  [SERVER] Running in ${mode} mode on port ${PORT}`,
  )
})
