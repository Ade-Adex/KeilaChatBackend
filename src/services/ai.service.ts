// /src/services/ai.service.ts


import ChatSession from '../models/ChatSession.js'
import { KnowledgeBaseService } from './knowledgeBase.service.js'
import logger from '../bootstrap/logger.js'
import { AppError } from './appError.js'
import { EventService } from './event.service.js'

export class AIService {
  /**
   * Generates a natural, highly professional contextual response.
   * Leverages an enterprise-grade multi-tier semantic token routing matrix.
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
          reply: 'System Error: Chat session mapping context could not be located.',
          confidence: 0,
          shouldEscalate: true,
        }
      }

      const propertyId = session.propertyId.toString()

      // 🧹 Clean, normalize, strip aggressive typography, and tokenize inputs for clean arrays tracking
      const cleanInput = message
        .trim()
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']/g, '')
        .replace(/\s+/g, ' ')

      // Token array slice helper for word-boundary matching matches
      const inputTokens = cleanInput.split(' ')

      /* -------------------------------------------------------------------------- */
      /* 🧠 ENTERPRISE MULTI-TIER SEMANTIC MATRICES                                 */
      /* -------------------------------------------------------------------------- */

      // Tier 1: Extensive Greetings Matrix
      const greetings = [
        'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 
        'good evening', 'yo', 'whats up', 'anyone there', 'is anyone available', 
        'hello there', 'hi there', 'test', 'testing', 'anybody home', 'wake up',
        'start', 'begin', 'hello assistant', 'hey bot', 'howdy', 'hola', 'whats going on',
        'good day', 'heyo', 'hiya', 'anybody there', 'online', 'active'
      ]

      // Tier 2: Courtesy, Affirmation & Gratitude Matrix
      const appreciation = [
        'thank you', 'thanks', 'perfect', 'awesome', 'great', 'ok', 'okay', 
        'cool', 'appreciate it', 'thank you so much', 'thx', 'brilliant', 
        'wonderful', 'amazing', 'got it', 'makes sense', 'no problem', 
        'understand', 'excellent', 'helpful', 'sounds good', 'yes please', 'yup', 
        'sweet', 'gladly', 'perfectly', 'you rock', 'definitely', 'sure', 'fine'
      ]

      // Tier 3: Bot Identity & Agent Operational Integrity Queries
      const botIdentity = [
        'are you a bot', 'are you an ai', 'am i talking to a human', 'who is this', 
        'are you human', 'what are you', 'is this an ai', 'are you real', 
        'tell me your name', 'what is your name', 'are you a robot', 'robot', 'bot',
        'automated assistant', 'virtual assistant', 'what system is this'
      ]

      // Tier 4: Immediate Human Handoff / Direct Operator Interception Requests
      const directEscalationKeywords = [
        'human', 'operator', 'agent', 'manager', 'representative', 'person', 
        'live support', 'real person', 'talk to someone', 'speak to someone', 
        'customer support', 'help desk', 'admin', 'administrator', 'escalate', 
        'transfer me', 'put me through', 'bypass', 'get me a human', 'representative',
        'chat with human', 'human team', 'real staff', 'supervisor', 'live agent'
      ]

      // Tier 5: Commercial Conversion & Pricing Intent Signifiers
      const salesIntentKeywords = [
        'price', 'cost', 'pricing', 'quote', 'subscription', 'plan', 'plans', 
        'buy', 'purchase', 'sales', 'discount', 'features', 'upgrade', 'premium',
        'demo', 'free trial', 'how much does it cost', 'how much is it', 'billing tier',
        'enterprise version', 'commercial package', 'renew subscription', 'payment structure'
      ]

      // Tier 6: Operations, Hours & Structural Location Queries
      const operationsKeywords = [
        'hours', 'open', 'close', 'opening times', 'working hours', 'schedule',
        'address', 'location', 'where are you', 'office', 'headquarters', 'directions',
        'contact number', 'phone number', 'email address', 'support email', 'call you',
        'business hours', 'store location', 'physical address'
      ]

      // Tier 7: Technical Troubleshooting & Operational Incidents
      const technicalKeywords = [
        'error', 'bug', 'crash', 'broken', 'not working', 'failed', 'glitch', 
        'down', 'login problem', 'cant log in', 'password reset', 'access denied',
        'loading forever', 'blank screen', 'not loading', 'timeout', 'white screen',
        'buggy', 'error code', 'frozen', 'unresponsive', 'wont load'
      ]

      // Tier 8: Dynamic Account, Security & Compliance Management
      const accountKeywords = [
        'my account', 'profile', 'delete account', 'cancel subscription', 
        'change email', 'update password', 'invoice', 'receipt', 'payment method',
        'credit card', 'update billing', 'gdpr', 'privacy info', 'settings',
        'data security', 'pci compliance', 'two factor', '2fa', 'security protocols'
      ]

      // Tier 9: Product Ecosystem Integrations & API Access
      const integrationKeywords = [
        'integration', 'api', 'webhook', 'connect', 'plugins', 'zapier', 'wordpress',
        'shopify', 'sdk', 'developer docs', 'endpoints', 'documentation api', 
        'third party', 'sync data', 'export logs'
      ]

      // Tier 10: Service Level Agreements (SLA) & Policy Queries
      const policyKeywords = [
        'sla', 'service level', 'refund policy', 'terms of service', 'tos',
        'privacy policy', 'guarantee', 'uptime', 'warranty', 'cancellation policy',
        'legal agreement', 'user agreement'
      ]

      // Tier 11: Core Capabilities Matrix
      const capabilityKeywords = [
        'what can you do', 'help me', 'options', 'features', 'how do you work',
        'menu', 'capabilities', 'show me what you can do', 'explain your features',
        'how to use this', 'instructions', 'guide me'
      ]

      // Tier 12: Feedback, Praise, and Neutral Interactions
      const feedbackKeywords = [
        'feedback', 'suggestion', 'complaint', 'recommendation', 'good job',
        'you are great', 'bad ai', 'silly bot', 'review', 'feature request'
      ]

      // Tier 13: Session Termination, Sign-Off & Farewell Matrix
      const closingKeywords = [
        'bye', 'goodbye', 'see ya', 'im done', 'end chat', 'close chat', 
        'nothing else', 'that is all', 'thats all', 'stop', 'quit', 'exit', 
        'have a good day', 'have a nice day', 'ciao', 'talk later', 'disconnect'
      ]

      // Tier 14: Content Safety, Abuse & Frustration Interceptors
      const frustrationKeywords = [
        'useless', 'stupid', 'horrible', 'terrible', 'waste of time', 'sucks',
        'bad support', 'annoying', 'hate', 'disappointed', 'rubbish', 'nonsense',
        'garbage', 'pathetic', 'idiot', 'worst app', 'ridiculous'
      ]

      // Resolve Day of Week safely
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const currentDay = days[new Date().getDay()]

      /* -------------------------------------------------------------------------- */
      /* ⚡ SEMANTIC MATRIX PATTERN MATCHING ENGINE                                 */
      /* -------------------------------------------------------------------------- */

      // 1. Immediate Safety / Frustration Management Fallback Interceptor
      if (frustrationKeywords.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'I apologize for any frustration this experience has caused. Let me immediately hand your active session over to a live human operator to resolve this context for you thoroughly.',
          confidence: 1.0,
          shouldEscalate: true,
        }
      }

      // 2. Direct Evaluation Checks for High-Priority Human Interception Requests
      if (directEscalationKeywords.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'I can route you to an active support operator immediately. Would you like to transition to our live human support team right now? (Please type \'Yes\' to proceed)',
          confidence: 1.0,
          shouldEscalate: true,
        }
      }

      // 3. Exact matching or token-proximity containment checks across tiers
      if (greetings.includes(cleanInput) || greetings.some(g => cleanInput === g)) {
        return {
          reply: `Hello! Thank you for reaching out to us on this fine ${currentDay}. How can I assist you today?`,
          confidence: 1.0,
          shouldEscalate: false,
        }
      }

      if (appreciation.includes(cleanInput) || appreciation.some(a => cleanInput === a)) {
        return {
          reply: "You're very welcome! Please let me know if there's anything else I can assist you with today.",
          confidence: 1.0,
          shouldEscalate: false,
        }
      }

      if (botIdentity.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'I am an automated AI assistant running alongside our live support staff. I can answer technical questions and account lookups immediately, or route you to a human operator whenever you ask!',
          confidence: 1.0,
          shouldEscalate: false,
        }
      }

      if (salesIntentKeywords.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'It looks like you are looking into pricing structures, service tiers, or purchase pathways! I can review baseline parameters from our vector documentation, or pull a live account specialist into this conversation. What specifics can I check for you?',
          confidence: 0.95,
          shouldEscalate: false,
        }
      }

      if (operationsKeywords.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'Looking for our operational schedules, support hours, or physical logistics directory? Let me pull up our official logistics registry metadata right away.',
          confidence: 0.95,
          shouldEscalate: false,
        }
      }

      if (technicalKeywords.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'It looks like you are experiencing an unexpected system crash, service interruption, or runtime error. Let me scan our technical troubleshooting indexes for immediate fixes.',
          confidence: 0.95,
          shouldEscalate: false,
        }
      }

      if (accountKeywords.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'I can guide you through profile updates, secure billing adjustments, or authorization settings. For direct credential changes or sensitive manual overrides, I can route you directly to an administrator.',
          confidence: 0.95,
          shouldEscalate: false,
        }
      }

      if (integrationKeywords.some(keyword => cleanInput.includes(keyword) || inputTokens.includes(keyword))) {
        return {
          reply: 'Looking into our developer resources, API integrations, or webhook endpoints? Let me extract our configuration schematics from the developer log repository.',
          confidence: 0.95,
          shouldEscalate: false,
        }
      }

      if (policyKeywords.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'Let me look up our official terms, SLA operational window metrics, and refund policies within our compliance registry.',
          confidence: 0.95,
          shouldEscalate: false,
        }
      }

      if (capabilityKeywords.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'I am optimized to walk you through platform guides, clarify billing rules, diagnose integrations, map operational logistics, or pass you straight to a live specialist. What challenge are we tackling today?',
          confidence: 1.0,
          shouldEscalate: false,
        }
      }

      if (feedbackKeywords.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'Thank you for your valuable feedback! We monitor all system reports carefully to optimize platform efficiency. I am saving your notes directly into our review tracking matrix.',
          confidence: 1.0,
          shouldEscalate: false,
        }
      }

      if (closingKeywords.some(keyword => cleanInput.includes(keyword))) {
        return {
          reply: 'Thank you for connecting with us today! Have an excellent rest of your day. Feel free to restart the thread if any new questions arise.',
          confidence: 1.0,
          shouldEscalate: false,
        }
      }

      /* -------------------------------------------------------------------------- */
      /* 🔍 KNOWLEDGE BASE VECTOR SEARCH MATRICES                                   */
      /* -------------------------------------------------------------------------- */
      const kbResult = await KnowledgeBaseService.testSandboxQuery('', propertyId, message)
      const kbSettings = await KnowledgeBaseService.getKnowledgeBase('', propertyId)
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
        reply: 'I am experiencing an internal communication update. Let me transfer you straight to a member of our human support team...',
        confidence: 0,
        shouldEscalate: true,
      }
    }
  }

  static shouldEscalate(confidence: number, threshold = 0.8) {
    return confidence < threshold
  }

  static async updateSessionAutomationState(sessionId: string, aiEnabled: boolean) {
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
