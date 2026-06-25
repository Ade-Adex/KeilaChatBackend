// /src/controllers/session.controller.ts

import type { Request, Response, NextFunction } from 'express'

import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'

import ChatSession from '../models/ChatSession.js'
import Property from '../models/Property.js'
import Visitor from '../models/Visitor.js'
import Message from '../models/Message.js'
import { Types } from 'mongoose'

/**
 * ----------------------------------------------------------------
 * POST /api/v1/sessions/initiate
 * Public (Widget)
 * ----------------------------------------------------------------
 */
export const initiateSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { widgetId, visitorId } = req.body

    if (!widgetId || !visitorId) {
      return next(new AppError('Required identifiers missing.', 400))
    }

    /**
     * Find Property
     */
    const property = await Property.findOne({ widgetId })

    if (!property) {
      return next(new AppError('Invalid widget configuration.', 404))
    }

    /**
     * Find or Create Visitor
     */
  const visitor = await Visitor.findOneAndUpdate(
    {
      propertyId: property._id,
      visitorTrackingId: visitorId,
    },
    {
      $set: {
        lastSeen: new Date(),
        isOnline: true,
      },
      $setOnInsert: {
        name: 'Anonymous Visitor',
        chatOpened: true,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    },
  )

    /**
     * Find existing active session
     */
    let session = await ChatSession.findOne({
      propertyId: property._id,
      visitorId: visitor._id,
      status: {
        $in: ['waiting', 'active'],
      },
    })

    let isNewSession = false

    /**
     * Create new session if none exists
     */
    if (!session) {
      session = await ChatSession.create({
        propertyId: property._id,
        visitorId: visitor._id,

        status: 'waiting',

        assignedOperatorId: null,

        aiEnabled: property.settings.aiEnabled,

        startedAt: new Date(),
      })

      isNewSession = true

      /**
       * Initial system message
       */
      await Message.create({
        sessionId: session._id,

        senderType: 'system',
        senderId: 'system',

        messageText:
          'Conversation started. Waiting for an operator to connect...',

        messageType: 'system',

        status: 'sent',

        isFromAI: false,

        attachments: [],

        readBy: [],
      })
    }

    res.status(isNewSession ? 201 : 200).json({
      success: true,

      data: {
        session: {
          _id: session._id,
          propertyId: session.propertyId,
          visitorId: session.visitorId,
          assignedOperatorId: session.assignedOperatorId,
          status: session.status,
          aiEnabled: session.aiEnabled,
          startedAt: session.startedAt,
          createdAt: session.createdAt,
        },
      },
    })
  },
)

/**
 * ----------------------------------------------------------------
 * GET /api/v1/sessions/property/:propertyId
 * Private
 * ----------------------------------------------------------------
 */
export const getPropertySessions = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { propertyId } = req.params

    if (!propertyId) {
      return next(new AppError('Property ID is required.', 400))
    }

    const sessions = await ChatSession.find({
      propertyId,
    })
      .populate('visitorId', 'name email lastSeen isOnline')
      .populate('assignedOperatorId', 'firstName lastName email isOnline')
      .sort({
        updatedAt: -1,
      })

    res.status(200).json({
      success: true,

      results: sessions.length,

      data: {
        sessions,
      },
    })
  },
)

/**
 * ----------------------------------------------------------------
 * PATCH /api/v1/sessions/:sessionId/end
 * ----------------------------------------------------------------
 */
export const endSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawSessionId = req.params.sessionId
    const endedBy = req.body?.endedBy

    if (!rawSessionId) {
      return next(new AppError('Session ID is required.', 400))
    }

    // normalize sessionId (fix string | string[])
    const sessionId = Array.isArray(rawSessionId)
      ? rawSessionId[0]
      : rawSessionId

    const session = await ChatSession.findById(sessionId)

    if (!session) {
      return next(new AppError('Session not found.', 404))
    }

    // close session
    session.status = 'closed'
    session.endedAt = new Date()
    await session.save()

    // create system message (NO need for new ObjectId conversion)
    const systemMessage = await Message.create({
      sessionId: session._id, // ✅ FIX: use ObjectId directly from mongoose doc

      senderType: 'system',
      senderId: 'system',

      messageText:
        endedBy === 'admin'
          ? 'This chat session has been closed by the support team.'
          : 'This chat session has been closed by the visitor.',

      messageType: 'system',
      status: 'sent',
      isFromAI: false,

      attachments: [],
      readBy: [],
    })

    // socket emit
    const io = req.app.get('socketService').getIO()

    io.to(`session:${sessionId}`).emit('new_message', systemMessage)

    io.to(`session:${sessionId}`).emit('session_closed', {
      sessionId,
      endedBy,
    })

   res.status(200).json({
     success: true,
     message: 'Session closed successfully.',
   })
  },
)