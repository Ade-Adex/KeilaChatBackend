// /src/services/assignment.service.ts

import Operator from '../models/Operator.js'
import ChatSession from '../models/ChatSession.js'

import { getAvailableOperators } from './operator.service.js'

export class AssignmentService {
  /**
   * Assign operator to session
   */
  static async assignOperatorToSession(propertyId: string, sessionId: string) {
    const operators = await getAvailableOperators(propertyId)

    const operator = operators.at(0)

    if (!operator) {
      return null
    }

    await ChatSession.findByIdAndUpdate(sessionId, {
      assignedOperatorId: operator._id,
      status: 'active',
      operatorJoinedAt: new Date(),
      lastActivityAt: new Date(),
    })

    operator.activeChatsCount = (operator.activeChatsCount ?? 0) + 1

    await operator.save()

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
