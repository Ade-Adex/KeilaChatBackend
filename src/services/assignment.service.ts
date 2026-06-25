// /src/services/assignment.service.ts

import Operator from '../models/Operator.js'
import { PresenceService } from './presence.service.js'

export class AssignmentService {
  static async assignOperator(accountId: string) {
    const operators = await Operator.find({
      accountId,
      status: 'active',
    }).lean()

    const onlineOperators = []

    for (const op of operators) {
      const isOnline = await PresenceService.isOperatorOnline(op._id.toString())
      if (isOnline) onlineOperators.push(op)
    }

    if (onlineOperators.length === 0) return null

    // sort by least load
    onlineOperators.sort((a, b) => {
      return (a.activeChatsCount || 0) - (b.activeChatsCount || 0)
    })

    return onlineOperators[0]
  }
}
