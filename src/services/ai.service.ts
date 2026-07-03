// /src/services/ai.service.ts
import ChatSession from '../models/ChatSession.js'
import { KnowledgeBaseService } from './knowledgeBase.service.js'
import logger from '../bootstrap/logger.js'
import { AppError } from './appError.js'
import { EventService } from './event.service.js'

export class AIService {
  /**
   * Generates a natural, highly professional contextual response.
   * Leverages a multi-tier semantic router for common intents prior to fallback triggers.
   */
  static async generateReply(message: string, context: any[]) {
    try {
      if (!context || context.length === 0) {
        return {
          reply: 'Hello! Welcome. How can I assist you today?',
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

      // Clean and sanitize string input for semantic routing matrix matching
      const cleanInput = message
        .trim()
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')

      /* -------------------------------------------------------------------------- */
      /* 🧠 MULTI-TIER SEMANTIC ROUTER (Professional Small-Talk Handling)           */
      /* -------------------------------------------------------------------------- */

      // Tier 1: Comprehensive Greetings Matrix
      const greetings = [
        'hello',
        'hi',
        'hey',
        'greetings',
        'good morning',
        'good afternoon',
        'good evening',
        'yo',
        'whats up',
        'anyone there',
        'is anyone available',
        'hello there',
        'hi there',
      ]

      // Tier 2: Courtesy & Gratitude Matrix
      const appreciation = [
        'thank you',
        'thanks',
        'perfect',
        'awesome',
        'great',
        'ok',
        'okay',
        'cool',
        'appreciate it',
        'thank you so much',
      ]

      // Tier 3: Bot Identity / Status Queries
      const botIdentity = [
        'are you a bot',
        'are you an ai',
        'am i talking to a human',
        'who is this',
        'are you human',
        'what are you',
      ]

      // Resolve Day of Week
      const days = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]
      const currentDay = days[new Date().getDay()]

      // Match Route: Greetings
      if (greetings.includes(cleanInput)) {
        return {
          reply: `Hello! Thank you for reaching out to us on this fine ${currentDay}. How can I assist you today?`,
          confidence: 1.0,
          shouldEscalate: false,
        }
      }

      // Match Route: Gratitude
      if (appreciation.includes(cleanInput)) {
        return {
          reply:
            "You're very welcome! Please let me know if there's anything else I can help you with today.",
          confidence: 1.0,
          shouldEscalate: false,
        }
      }

      // Match Route: Bot Identity
      if (botIdentity.includes(cleanInput)) {
        return {
          reply:
            'I am an automated assistant running alongside our live service team. I can answer general documentation questions right away, or route you to an available live agent whenever you need help!',
          confidence: 1.0,
          shouldEscalate: false,
        }
      }

      /* -------------------------------------------------------------------------- */
      /* 🔍 KNOWLEDGE BASE VECTOR SEARCH MATRICES                                   */
      /* -------------------------------------------------------------------------- */
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

      /* -------------------------------------------------------------------------- */
      /* 🚨 ESCALATION MANAGEMENT WORKFLOW                                         */
      /* -------------------------------------------------------------------------- */
      logger.info(
        { propertyId, sessionId: session._id },
        'AI confidence threshold breach. Offering handoff question.',
      )

      const baseFallback =
        kbSettings.fallbackMessage ||
        "I want to make sure you get the absolute best answer. I don't have the explicit information matching your request directly within my system logs."

      const transferQuestion =
        "\n\nWould you like me to transfer your session immediately to an available live support operator? (Please type 'Yes' to proceed)"

      return {
        reply: `${baseFallback}${transferQuestion}`,
        confidence: kbResult.confidenceScore,
        shouldEscalate: true,
      }
    } catch (error) {
      logger.error(error, 'Error in AIService processing loop')
      return {
        reply:
          'I am experiencing an internal communication update. Let me transfer you straight to a member of our human support team...',
        confidence: 0,
        shouldEscalate: true,
      }
    }
  }

  static shouldEscalate(confidence: number, threshold = 0.8) {
    return confidence < threshold
  }

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
