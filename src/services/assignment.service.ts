// /src/services/assignment.service.ts
import Operator from '../models/Operator.js'
import ChatSession from '../models/ChatSession.js'
import Property from '../models/Property.js' // 🎯 Added import
import { getAvailableOperators } from './operator.service.js'
import logger from '../bootstrap/logger.js'

export class AssignmentService {
  /**
   * Assign operator to session safely using the correct account reference
   */
  static async assignOperatorToSession(propertyId: string, sessionId: string) {
    const propertyDoc = await Property.findById(propertyId)
      .select('accountId')
      .lean()
    if (!propertyDoc || !propertyDoc.accountId) {
      return null
    }

    const operators = await getAvailableOperators(
      propertyDoc.accountId.toString(),
    )

    const operator = operators.at(0)

    if (!operator) {
      return null
    }

   const currentSession = await ChatSession.findById(sessionId)
     .select('createdAt')
     .lean()
   const now = new Date()
   // Calculate duration between session creation and assignment
   const waitTimeMs = currentSession
     ? now.getTime() - new Date(currentSession.createdAt).getTime()
     : 0

  await ChatSession.findByIdAndUpdate(sessionId, {
    assignedOperatorId: operator._id,
    status: 'active',
    operatorJoinedAt: now,
    lastActivityAt: now,
    waitTimeMs: waitTimeMs,
  }).populate(
    'visitorId',
    'name email metadata tags notes firstVisitAt unreadMessages currentPage referrer isOnline lastSeen pageViews chatOpened',
  )

   await Operator.updateOne(
     { _id: operator._id },
     {
       $inc: {
         activeChatsCount: 1,
         'stats.chatsHandled': 1, 
       },
     },
   )

    return operator
  }

  /**
   * Release operator after chat ends
   */
  static async releaseOperator(operatorId: string) {
    const operator = await Operator.findById(operatorId)

    if (!operator) {
      return null
    }

    operator.activeChatsCount = Math.max(
      0,
      (operator.activeChatsCount ?? 0) - 1,
    )

    await operator.save()

    return operator
  }
}