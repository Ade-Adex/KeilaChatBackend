// /src/controllers/chat.controller.ts

// import type { Request, Response, NextFunction } from 'express'

// import { catchAsync } from '../config/errorHandler.js'

// import { AppError } from '../services/appError.js'

// import {
//   initializeChat,
//   closeChat,
//   assignSessionToOperator,
//   operatorJoinChat,
//   operatorLeaveChat,
//   transferChat,
//   updateTyping,
//   rateSession,
//   addInternalNote,
// } from '../services/chat-session.service.js'

// function getParam(value: string | string[] | undefined, name: string): string {
//   if (!value || Array.isArray(value)) {
//     throw new AppError(`${name} is required`, 400)
//   }

//   return value
// }

// /* -------------------------------------------------- */
// /* Initialize Chat                                    */
// /* -------------------------------------------------- */

// export const createChat = catchAsync(
//   async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     const { widgetId, visitorTrackingId, metadata } = req.body

//     if (!widgetId) {
//       return next(new AppError('Widget ID is required', 400))
//     }

//     const result = await initializeChat(
//       widgetId,
//       visitorTrackingId,
//       metadata ?? {},
//     )

//     res.status(201).json({
//       status: 'success',
//       data: result,
//     })
//   },
// )

// /* -------------------------------------------------- */
// /* Close Chat                                         */
// /* -------------------------------------------------- */

// export const endChat = catchAsync(
//   async (req: Request, res: Response): Promise<void> => {
//     const sessionId = getParam(req.params.sessionId, 'Session ID')

//     const { closedBy } = req.body

//     const session = await closeChat(sessionId, closedBy)

//     res.status(200).json({
//       status: 'success',
//       data: session,
//     })
//   },
// )

// /* -------------------------------------------------- */
// /* Assign Operator                                    */
// /* -------------------------------------------------- */

// export const assignOperator = catchAsync(
//   async (req: Request, res: Response): Promise<void> => {
//     const sessionId = getParam(req.params.sessionId, 'Session ID')

//     const { operatorId } = req.body

//     const session = await assignSessionToOperator(sessionId, operatorId)

//     res.status(200).json({
//       status: 'success',
//       data: session,
//     })
//   },
// )

// /* -------------------------------------------------- */
// /* Operator Join                                      */
// /* -------------------------------------------------- */

// export const joinChat = catchAsync(
//   async (req: Request, res: Response): Promise<void> => {
//     const sessionId = getParam(req.params.sessionId, 'Session ID')

//     const { operatorId } = req.body

//     const session = await operatorJoinChat(sessionId, operatorId)

//     res.status(200).json({
//       status: 'success',
//       data: session,
//     })
//   },
// )

// /* -------------------------------------------------- */
// /* Operator Leave                                     */
// /* -------------------------------------------------- */

// export const leaveChat = catchAsync(
//   async (req: Request, res: Response): Promise<void> => {
//     const sessionId = getParam(req.params.sessionId, 'Session ID')

//     const { operatorId } = req.body
//     const session = await operatorLeaveChat(sessionId, operatorId)

//     res.status(200).json({
//       status: 'success',
//       data: session,
//     })
//   },
// )

// /* -------------------------------------------------- */
// /* Transfer Chat                                      */
// /* -------------------------------------------------- */

// export const transferSession = catchAsync(
//   async (req: Request, res: Response): Promise<void> => {
//     const sessionId = getParam(req.params.sessionId, 'Session ID')
//     const fromOperatorId = (req as any).user.userId

//     const { toOperatorId } = req.body

//     const session = await transferChat(sessionId, fromOperatorId, toOperatorId)

//     res.status(200).json({
//       status: 'success',
//       data: session,
//     })
//   },
// )

// /* -------------------------------------------------- */
// /* Typing                                             */
// /* -------------------------------------------------- */

// export const typingStatus = catchAsync(
//   async (req: Request, res: Response): Promise<void> => {
//     const sessionId = getParam(req.params.sessionId, 'Session ID')

//     const { actor, typing } = req.body

//     const session = await updateTyping(sessionId, actor, typing)

//     res.status(200).json({
//       status: 'success',
//       data: session,
//     })
//   },
// )

// /* -------------------------------------------------- */
// /* Rating                                             */
// /* -------------------------------------------------- */

// export const submitRating = catchAsync(
//   async (req: Request, res: Response): Promise<void> => {
//     const sessionId = getParam(req.params.sessionId, 'Session ID')

//     const { stars, feedback } = req.body

//     const session = await rateSession(sessionId, stars, feedback)

//     res.status(200).json({
//       status: 'success',
//       data: session,
//     })
//   },
// )

// /* -------------------------------------------------- */
// /* Internal Note                                      */
// /* -------------------------------------------------- */

// export const createInternalNote = catchAsync(
//   async (req: Request, res: Response): Promise<void> => {
//     const sessionId = getParam(req.params.sessionId, 'Session ID')

//     const { operatorId, note } = req.body

//     const session = await addInternalNote(sessionId, operatorId, note)

//     res.status(200).json({
//       status: 'success',
//       data: session,
//     })
//   },
// )

import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import ChatSession from '../models/ChatSession.js'


import {
  initializeChat,
  closeChat,
  assignSessionToOperator,
  operatorJoinChat,
  operatorLeaveChat,
  transferChat,
  updateTyping,
  rateSession,
  addInternalNote,
} from '../services/chat-session.service.js'

// 🎯 UNIFIED VISITOR TELEMETRY PROJECTION CONSTANT
const VISITOR_POPULATE_FIELDS =
  'name email metadata tags notes firstVisitAt unreadMessages currentPage referrer isOnline lastSeen pageViews chatOpened'

function getParam(value: string | string[] | undefined, name: string): string {
  if (!value || Array.isArray(value)) {
    throw new AppError(`${name} is required`, 400)
  }
  return value
}

/* -------------------------------------------------- */
/* Initialize Chat & Save Visitor Entry Metrics       */
/* -------------------------------------------------- */
export const createChat = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { widgetId, visitorTrackingId, metadata } = req.body

    if (!widgetId) {
      return next(new AppError('Widget ID is required', 400))
    }

    const result = await initializeChat(
      widgetId,
      visitorTrackingId,
      metadata ?? {},
    )

    // 🎯 RE-FETCH WITH FULLY POPULATED VISITOR METRICS
    const populatedSession = await ChatSession.findById(result.sessionId)
      .populate('visitorId', VISITOR_POPULATE_FIELDS)
      .lean()

    res.status(201).json({
      status: 'success',
      data: populatedSession || result,
    })
  },
)

/* -------------------------------------------------- */
/* Close Chat                                         */
/* -------------------------------------------------- */
export const endChat = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = getParam(req.params.sessionId, 'Session ID')
    const { closedBy } = req.body

    const session = await closeChat(sessionId, closedBy)

    const populated = await ChatSession.findById(session._id)
      .populate('visitorId', VISITOR_POPULATE_FIELDS)
      .lean()

    res.status(200).json({
      status: 'success',
      data: populated || session,
    })
  },
)

/* -------------------------------------------------- */
/* Assign Operator                                    */
/* -------------------------------------------------- */
export const assignOperator = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = getParam(req.params.sessionId, 'Session ID')
    const { operatorId } = req.body

    const session = await assignSessionToOperator(sessionId, operatorId)

    const populated = await ChatSession.findById(session._id)
      .populate('visitorId', VISITOR_POPULATE_FIELDS)
      .lean()

    res.status(200).json({
      status: 'success',
      data: populated || session,
    })
  },
)

/* -------------------------------------------------- */
/* Operator Join                                      */
/* -------------------------------------------------- */
export const joinChat = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = getParam(req.params.sessionId, 'Session ID')
    const { operatorId } = req.body

    const session = await operatorJoinChat(sessionId, operatorId)

    const populated = await ChatSession.findById(session._id)
      .populate('visitorId', VISITOR_POPULATE_FIELDS)
      .lean()

    res.status(200).json({
      status: 'success',
      data: populated || session,
    })
  },
)

/* -------------------------------------------------- */
/* Operator Leave                                     */
/* -------------------------------------------------- */
export const leaveChat = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = getParam(req.params.sessionId, 'Session ID')
    const { operatorId } = req.body

    const session = await operatorLeaveChat(sessionId, operatorId)

    const populated = await ChatSession.findById(session._id)
      .populate('visitorId', VISITOR_POPULATE_FIELDS)
      .lean()

    res.status(200).json({
      status: 'success',
      data: populated || session,
    })
  },
)

/* -------------------------------------------------- */
/* Transfer Chat                                      */
/* -------------------------------------------------- */
export const transferSession = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = getParam(req.params.sessionId, 'Session ID')
    const fromOperatorId = (req as any).user.userId
    const { toOperatorId } = req.body

    const session = await transferChat(sessionId, fromOperatorId, toOperatorId)

    const populated = await ChatSession.findById(session._id)
      .populate('visitorId', VISITOR_POPULATE_FIELDS)
      .lean()

    res.status(200).json({
      status: 'success',
      data: populated || session,
    })
  },
)

/* -------------------------------------------------- */
/* Generic Route Handlers                             */
/* -------------------------------------------------- */
export const typingStatus = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = getParam(req.params.sessionId, 'Session ID')
    const { actor, typing } = req.body

    const session = await updateTyping(sessionId, actor, typing)
    res.status(200).json({ status: 'success', data: session })
  },
)

export const submitRating = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = getParam(req.params.sessionId, 'Session ID')
    const { stars, feedback } = req.body

    const session = await rateSession(sessionId, stars, feedback)
    res.status(200).json({ status: 'success', data: session })
  },
)

export const createInternalNote = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = getParam(req.params.sessionId, 'Session ID')
    const { operatorId, note } = req.body

    const session = await addInternalNote(sessionId, operatorId, note)
    res.status(200).json({ status: 'success', data: session })
  },
)