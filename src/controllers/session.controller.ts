// /src/controllers/session.controller.ts

import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import ChatSession from '../models/ChatSession.js'
import Property from '../models/Property.js'
import Visitor from '../models/Visitor.js'

/**
 * @route   POST /api/v1/sessions/initiate
 * @desc    Fetch active session or initialize a brand new conversation thread for a visitor
 * @access  Public (Widget Client-Side)
 */
export const initiateSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { propertyId, visitorId } = req.body

    if (!propertyId || !visitorId) {
      return next(new AppError('Property ID and Visitor ID are required.', 400))
    }

    // 1. Verify the Property exists
    const property = await Property.findById(propertyId)
    if (!property) {
      return next(new AppError('Invalid property context.', 404))
    }

    // 2. Find or Create the Visitor
    // We use findOneAndUpdate with upsert: true to handle new visitors automatically
    let visitor = await Visitor.findOneAndUpdate(
      { visitorTrackingId: visitorId, propertyId },
      {
        $setOnInsert: {
          name: 'Anonymous Visitor',
          lastSeen: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    // 3. Look for an existing unresolved session for this visitor
    let session = await ChatSession.findOne({
      propertyId,
      visitorId: visitor._id,
      status: { $in: ['unassigned', 'active'] },
    })

    let isNewSession = false

    // 4. If no active thread exists, initialize a new one
    if (!session) {
      session = await ChatSession.create({
        propertyId,
        visitorId: visitor._id,
        status: 'unassigned',
        assignedOperatorId: null,
      })
      isNewSession = true
    }

    res.status(isNewSession ? 201 : 200).json({
      status: 'success',
      data: {
        session: {
          _id: session._id,
          propertyId: session.propertyId,
          visitorId: session.visitorId,
          status: session.status,
        },
      },
    })
  },
)

/**
 * @route   GET /api/v1/sessions/property/:propertyId
 * @desc    Retrieve all conversation tracks belonging to a given property for the agent panel
 * @access  Private (Requires authentication tracking eventually)
 */
export const getPropertySessions = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { propertyId } = req.params

    if (!propertyId) {
      return next(new AppError('Property tracking ID param is required.', 400))
    }

    // Fetch conversations sorted by the most recently updated chats first, inflating user metadata profiles inline
    const sessions = await ChatSession.find({ propertyId })
      .populate('visitorId', 'name email lastSeen')
      .populate('assignedOperatorId', 'firstName lastName email')
      .sort({ updatedAt: -1 })

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: { sessions },
    })
  },
)