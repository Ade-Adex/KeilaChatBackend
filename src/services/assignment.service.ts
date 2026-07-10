// /src/services/assignment.service.ts
import Operator from '../models/Operator.js'
import ChatSession from '../models/ChatSession.js'
import Property from '../models/Property.js' // 🎯 Added import
import { getAvailableOperators } from './operator.service.js'

export class AssignmentService {
  /**
   * Assign operator to session safely using the correct account reference
   */
  static async assignOperatorToSession(propertyId: string, sessionId: string) {
    // 🎯 FIX: Fetch the property first to extract its parent accountId
    const propertyDoc = await Property.findById(propertyId)
      .select('accountId')
      .lean()
    if (!propertyDoc || !propertyDoc.accountId) {
      return null
    }

    // 🎯 FIX: Pass the correct accountId string instead of the propertyId string
    const operators = await getAvailableOperators(
      propertyDoc.accountId.toString(),
    )

    const operator = operators.at(0)

    console.log('Assigned operator:', operator)
    console.log('Session ID:', sessionId)
    console.log('Property ID:', propertyId)
    console.log('Account ID:', propertyDoc)

    if (!operator) {
      return null
    }

    await ChatSession.findByIdAndUpdate(sessionId, {
      assignedOperatorId: operator._id,
      status: 'active',
      operatorJoinedAt: new Date(),
      lastActivityAt: new Date(),
    })

    // 🎯 Use updateOne to safely prevent schema version conflicts or missing document states
    await Operator.updateOne(
      { _id: operator._id },
      { $inc: { activeChatsCount: 1 } },
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