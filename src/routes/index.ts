// /src/routes/index.ts

import { Router } from 'express'

import authRouter from './auth.routes.js'
import widgetRouter from './v1/widget.routes.js'
import sessionRouter from './v1/session.routes.js'
import propertyRouter from './v1/property.routes.js'
import operatorRouter from './v1/operator.routes.js'
import chatRoutes from './v1/chat.routes.js'
import messageRouter from './v1/message.routes.js'
import notificationRouter from './v1/notification.routes.js'
import aiRouter from './v1/ai.routes.js'
import accountRouter from './v1/account.routes.js' 
import dashboardRouter from './v1/dashboard.routes.js'


const router = Router()

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API running' })
})

// Look for this block in /src/routes/index.ts and group it cleanly under v1:

router.use('/auth', authRouter)
router.use('/widget', widgetRouter)
router.use('/sessions', sessionRouter)
router.use('/properties', propertyRouter)
router.use('/operators', operatorRouter)
router.use('/chat', chatRoutes)
router.use('/messages', messageRouter) // <-- Moved here! Now it correctly listens on /api/v1/messages
router.use('/notifications', notificationRouter)
router.use('/dashboard', dashboardRouter)
router.use('/ai', aiRouter)
router.use('/account', accountRouter) 

export default router