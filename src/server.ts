// // /src/server.ts

// import dotenv from 'dotenv'
// dotenv.config()

// import express from 'express'
// import http from 'http'
// import cors from 'cors'

// import connectDB from './config/db.js'
// import appRouter from './routes/index.js'
// import { globalErrorHandler } from './config/errorHandler.js'
// import { SocketService } from './services/socket.service.js'

// const app = express()
// const server = http.createServer(app)

// connectDB()

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Allow non-browser requests (no origin) or your specific allowed domains
//       const allowedOrigins = [
//         'https://keila-chat.vercel.app',
//         'http://localhost:3000',
//       ]

//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true)
//       } else {
//         // This is the important fix: actually block the unauthorized origin
//         callback(new Error('Not allowed by CORS'))
//       }
//     },
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     credentials: true,
//     allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
//   }),
// )

// app.use(express.json())

// // Main Modular Routes Mount Point
// app.use('/api/v1', appRouter)

// const socketService = new SocketService(server)

// app.set('socketService', socketService)

// app.use(globalErrorHandler)

// const PORT = process.env.PORT || 5000
// server.listen(PORT, () => {
//   const mode = process.env.NODE_ENV || 'development'
//   console.log(
//     '\x1b[35m%s\x1b[0m',
//     `🖥️  [SERVER] Running in ${mode} mode on port ${PORT}`,
//   )
// })





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
import cookieParser from 'cookie-parser'

const app = express()
const server = http.createServer(app)

connectDB()

// 1. Correct CORS Implementation
// Using the 'cors' package handles the preflight (OPTIONS) requests
// and dynamically sets the Access-Control-Allow-Origin header
// to the request origin, which is required when credentials: true.
app.use(
  cors({
    origin: (origin, callback) => {
      // In a widget architecture, we allow the origin because
      // the actual security check happens in your controller's
      // domain validation logic.
      callback(null, true)
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }),
)


app.use(cookieParser())

// 2. Middleware
app.use(express.json())

// 3. Main Modular Routes
app.use('/api/v1', appRouter)

// 4. Services
const socketService = new SocketService(server)
app.set('socketService', socketService)

// 5. Error Handling
app.use(globalErrorHandler)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  const mode = process.env.NODE_ENV || 'development'
  console.log(
    '\x1b[35m%s\x1b[0m',
    `🖥️  [SERVER] Running in ${mode} mode on port ${PORT}`,
  )
})