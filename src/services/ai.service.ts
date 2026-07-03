// /src/services/ai.service.ts
import ChatSession from '../models/ChatSession.js'
import { KnowledgeBaseService } from './knowledgeBase.service.js'
import logger from '../bootstrap/logger.js'
import { AppError } from './appError.js'
import { EventService } from './event.service.js'

export class AIService {
  /**
   * Generates a contextual reply by searching the property's specialized Knowledge Base.
   * Drops back to human handoff settings if confidence drops below target thresholds.
   */
  static async generateReply(message: string, context: any[]) {
    try {
      if (!context || context.length === 0) {
        return {
          reply: 'Hello! How can I help you today?',
          confidence: 1.0,
          shouldEscalate: false,
        }
      }

      const sampleMsg = context[0]
      const session = await ChatSession.findById(sampleMsg.sessionId).lean()

      if (!session) {
        return {
          reply:
            'System Error: Chat session mapping context could not be located.',
          confidence: 0,
          shouldEscalate: true,
        }
      }

      const propertyId = session.propertyId.toString()

      const kbResult = await KnowledgeBaseService.testSandboxQuery(
        '',
        propertyId,
        message,
      )

      const kbSettings = await KnowledgeBaseService.getKnowledgeBase(
        '',
        propertyId,
      )
      const threshold = kbSettings.confidenceThreshold ?? 0.8

      if (kbResult.matched && kbResult.confidenceScore >= threshold) {
        return {
          reply: kbResult.answer,
          confidence: kbResult.confidenceScore,
          shouldEscalate: false,
        }
      }

      logger.info(
        { propertyId, sessionId: session._id },
        'AI confidence threshold breach. Offering handoff question.',
      )

      const baseFallback =
        kbSettings.fallbackMessage ||
        "Sorry, I couldn't find an answer to that."
      const transferQuestion =
        "\n\nWould you like me to transfer your chat to an available live agent? (Reply 'Yes')"

      return {
        reply: `${baseFallback}${transferQuestion}`,
        confidence: kbResult.confidenceScore,
        shouldEscalate: true,
      }
    } catch (error) {
      logger.error(error, 'Error in AIService processing loop')
      return {
        reply:
          'I am experiencing technical difficulties. Connecting you to an agent...',
        confidence: 0,
        shouldEscalate: true,
      }
    }
  }

  /**
   * Evaluates if low prediction margins require agent routing intervention
   */
  static shouldEscalate(confidence: number, threshold = 0.8) {
    return confidence < threshold
  }

  /**
   * Modifies a session's automation status flags and pushes layout updates to dashboards
   */
  static async updateSessionAutomationState(
    sessionId: string,
    aiEnabled: boolean,
  ) {
    const session = await ChatSession.findById(sessionId)
    if (!session) {
      throw new AppError('Target chat session could not be located.', 404)
    }

    session.aiEnabled = aiEnabled

    if (!aiEnabled) {
      session.aiHandled = false
      if (!session.assignedOperatorId) {
        session.status = 'queued'
      }
    } else {
      session.aiEscalated = false
    }

    await session.save()

    EventService.emitToProperty(
      session.propertyId.toString(),
      'dashboard_refresh_request',
      {},
    )

    return {
      sessionId: session._id,
      aiEnabled: session.aiEnabled,
      status: session.status,
    }
  }
}
