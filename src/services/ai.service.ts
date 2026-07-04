// // /src/services/ai.service.ts

// import ChatSession from '../models/ChatSession.js'
// import { KnowledgeBaseService } from './knowledgeBase.service.js'
// import logger from '../bootstrap/logger.js'
// import { AppError } from './appError.js'
// import { EventService } from './event.service.js'

// export class AIService {
//   /**
//    * Generates a natural, highly professional contextual response.
//    * Leverages an enterprise-grade multi-tier semantic token routing matrix.
//    */
//   static async generateReply(message: string, context: any[]) {
//     try {
//       if (!context || context.length === 0) {
//         return {
//           reply:
//             "Hello and welcome! I'm your virtual assistant. How may I assist you today?",
//           confidence: 1,
//           shouldEscalate: false,
//         }
//       }

//       const sampleMsg = context[0]

//       const session = await ChatSession.findById(sampleMsg.sessionId).lean()

//       if (!session) {
//         return {
//           reply:
//             "I couldn't establish your chat session properly. Let me connect you with support.",
//           confidence: 0,
//           shouldEscalate: true,
//         }
//       }

//       const propertyId = session.propertyId.toString()

//       const cleanInput = message
//         .trim()
//         .toLowerCase()
//         .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']/g, '')
//         .replace(/\s+/g, ' ')

//       /* ------------------------------------------------ */
//       /* ENTERPRISE CONVERSATIONAL INTELLIGENCE ENGINE    */
//       /* ------------------------------------------------ */

//       const enterpriseIntents = [
//         /* Greetings */

//         {
//           patterns: [
//             'hello',
//             'hi',
//             'hey',
//             'heyy',
//             'hello there',
//             'hi there',
//             'hey there',
//             'good morning',
//             'good afternoon',
//             'good evening',
//             'good day',
//             'howdy',
//             'yo',
//             'sup',
//             'whats up',
//             'is anyone there',
//             'anyone there',
//           ],
//           responses: [
//             'Hello! Welcome. How may I assist you today?',
//             "Hi there! It's great to hear from you. How can I help?",
//             'Hello and thank you for reaching out. What can I assist you with today?',
//           ],
//         },

//         /* Identity */

//         {
//           patterns: [
//             'who are you',
//             'who r u',
//             'who is this',
//             'what are you',
//             'tell me about yourself',
//             'introduce yourself',
//             'who am i talking to',
//           ],
//           responses: [
//             "I'm an AI-powered virtual assistant designed to provide quick, helpful, and professional support.",
//             "I'm your virtual assistant. I can answer questions, provide guidance, and connect you with our support team whenever needed.",
//             "I'm an automated assistant working alongside our human support specialists to help provide faster service.",
//           ],
//         },

//         /* Human */

//         {
//           patterns: [
//             'are you human',
//             'are you real',
//             'are you ai',
//             'are you a robot',
//             'are you a bot',
//             'are you alive',
//           ],
//           responses: [
//             "I'm an AI assistant working together with our human support team.",
//             "I'm an automated assistant designed to help answer questions quickly and efficiently.",
//             "I'm an AI-powered assistant, but our human support team is always available whenever needed.",
//           ],
//         },

//         /* Capabilities */

//         {
//           patterns: [
//             'what can you do',
//             'help me',
//             'capabilities',
//             'features',
//             'how do you work',
//             'what do you do',
//           ],
//           responses: [
//             'I can answer questions, provide guidance, help troubleshoot issues, and connect you with our support specialists.',
//             'I can help explain services, answer questions, and assist in finding the information you need.',
//             "I'm here to make getting help faster and easier. How can I assist?",
//           ],
//         },

//         /* Small talk */

//         {
//           patterns: [
//             'how are you',
//             'how are you doing',
//             'hows your day',
//             'how have you been',
//           ],
//           responses: [
//             "I'm doing great, thank you for asking. How may I assist you today?",
//             "I'm doing well and ready to help however I can.",
//             "Thank you for asking. I'm here and ready to assist.",
//           ],
//         },

//         {
//           patterns: ['nice to meet you'],
//           responses: [
//             "It's a pleasure meeting you too. How may I help today?",
//             'Likewise! I look forward to assisting you.',
//           ],
//         },

//         /* Love */

//         {
//           patterns: ['i love you', 'do you love me'],
//           responses: [
//             "That's very kind of you. My goal is always to provide the best assistance possible.",
//             "I appreciate the kindness. I'm always happy to help.",
//           ],
//         },

//         /* Smart */

//         {
//           patterns: ['are you smart', 'how smart are you'],
//           responses: [
//             "I do my best to provide accurate and helpful information, and when I'm uncertain, I'll connect you with a human specialist.",
//             "I'm designed to provide helpful assistance and reliable guidance whenever possible.",
//           ],
//         },

//         /* Sleep */

//         {
//           patterns: ['do you sleep', 'when do you sleep'],
//           responses: [
//             "I don't need sleep, which means I'm available whenever you need assistance.",
//             "Fortunately for both of us, I don't require sleep breaks.",
//           ],
//         },

//         /* Eat */

//         {
//           patterns: ['do you eat', 'what do you eat', 'favorite food'],
//           responses: [
//             "I don't eat, but I've heard pizza is a popular choice among humans.",
//             "I don't eat food myself, but I do process a lot of conversations.",
//           ],
//         },

//         /* Marriage */

//         {
//           patterns: [
//             'are you married',
//             'do you have a wife',
//             'do you have a husband',
//             'are you single',
//           ],
//           responses: [
//             "I don't have personal relationships, but I'm always here to help.",
//             "I'm focused entirely on providing assistance.",
//           ],
//         },

//         /* Lonely */

//         {
//           patterns: ['are you lonely', 'do you get lonely'],
//           responses: [
//             "I don't experience loneliness, but I'm always happy to have a conversation.",
//             "I'm always available and ready to assist whenever needed.",
//           ],
//         },

//         /* Feelings */

//         {
//           patterns: ['do you have feelings', 'can you feel', 'do you feel'],
//           responses: [
//             "I don't experience emotions like humans do, but I'm designed to communicate with empathy and understanding.",
//             "While I don't have feelings, I aim to provide thoughtful and helpful responses.",
//           ],
//         },

//         /* Dreams */

//         {
//           patterns: ['do you dream'],
//           responses: [
//             "I don't dream, but I'm always preparing to help answer the next question.",
//           ],
//         },

//         /* Creator */

//         {
//           patterns: ['who made you', 'who created you', 'who built you'],
//           responses: [
//             'I was created to provide fast, helpful, and professional support experiences.',
//             'I was designed to help visitors get answers and assistance quickly.',
//           ],
//         },

//         /* Jokes */

//         {
//           patterns: ['tell me a joke', 'say something funny', 'make me laugh'],
//           responses: [
//             'Why do developers prefer dark mode? Because light attracts bugs.',
//             'Why was the developer broke? Because they used up all their cache.',
//             "There are only 10 kinds of people: those who understand binary and those who don't.",
//           ],
//         },

//         /* Compliments */

//         {
//           patterns: [
//             'you are smart',
//             'you are amazing',
//             'you are awesome',
//             'good bot',
//             'great bot',
//             'you are beautiful',
//           ],
//           responses: [
//             'Thank you very much. I appreciate the compliment.',
//             "That's very kind of you. I'm happy to help.",
//             "Thank you. I'll continue doing my best to assist.",
//           ],
//         },

//         /* Emotional support */

//         {
//           patterns: [
//             'im sad',
//             'i am sad',
//             'im stressed',
//             'i am stressed',
//             'im worried',
//             'i am worried',
//             'im anxious',
//             'i am anxious',
//             'im upset',
//             'i am upset',
//           ],
//           responses: [
//             "I'm sorry to hear that. While I may not fully understand human emotions, I'm here to help however I can.",
//             "That sounds difficult. I'll do my best to assist you.",
//             "I'm sorry you're going through that. Let me know how I can help.",
//           ],
//         },

//         /* Thanks */

//         {
//           patterns: ['thank you', 'thanks', 'thx', 'thank you so much'],
//           responses: [
//             "You're very welcome. Please let me know if there's anything else I can help with.",
//             'Happy to help. Feel free to ask if you need anything else.',
//             "My pleasure. I'm here whenever you need assistance.",
//           ],
//         },

//         /* Goodbye */

//         {
//           patterns: ['bye', 'goodbye', 'see you', 'talk later'],
//           responses: [
//             'Thank you for contacting us today. Have a wonderful day.',
//             'Take care, and feel free to return if you need any assistance.',
//             'It was a pleasure assisting you. Have a great day.',
//           ],
//         },
//       ]

//       /* ------------------------------------------------ */
//       /* ENTERPRISE INTENT DETECTION                      */
//       /* ------------------------------------------------ */

//       for (const intent of enterpriseIntents) {
//         const matched = intent.patterns.some(
//           (p) =>
//             cleanInput === p ||
//             cleanInput.includes(p) ||
//             p.includes(cleanInput),
//         )

//         if (matched) {
//           return {
//             reply:
//               intent.responses[
//                 Math.floor(Math.random() * intent.responses.length)
//               ],
//             confidence: 1,
//             shouldEscalate: false,
//           }
//         }
//       }

//       /* ------------------------------------------------ */
//       /* EMOTION DETECTION                                */
//       /* ------------------------------------------------ */

//       const angryWords = [
//         'angry',
//         'mad',
//         'frustrated',
//         'annoyed',
//         'hate',
//         'terrible',
//         'stupid',
//         'useless',
//       ]

//       if (angryWords.some((w) => cleanInput.includes(w))) {
//         return {
//           reply:
//             "I'm sorry this has been frustrating. I'd be happy to connect you with one of our support specialists who can assist you further.",
//           confidence: 1,
//           shouldEscalate: true,
//         }
//       }

//       /* ------------------------------------------------ */
//       /* HUMAN HANDOFF                                    */
//       /* ------------------------------------------------ */

//       const humanWords = [
//         'human',
//         'agent',
//         'operator',
//         'representative',
//         'manager',
//         'support',
//       ]

//       if (humanWords.some((w) => cleanInput.includes(w))) {
//         return {
//           reply:
//             "Certainly. I can connect you with a live support representative. Please reply 'Yes' to continue.",
//           confidence: 1,
//           shouldEscalate: true,
//         }
//       }

//       /* ------------------------------------------------ */
//       /* KNOWLEDGE BASE                                   */
//       /* ------------------------------------------------ */

//       const kbResult = await KnowledgeBaseService.testSandboxQuery(
//         '',
//         propertyId,
//         message,
//       )

//       const kbSettings = await KnowledgeBaseService.getKnowledgeBase(
//         '',
//         propertyId,
//       )

//       const threshold = kbSettings.confidenceThreshold ?? 0.8

//       if (kbResult.matched && kbResult.confidenceScore >= threshold) {
//         return {
//           reply: kbResult.answer,
//           confidence: kbResult.confidenceScore,
//           shouldEscalate: false,
//         }
//       }

//       /* ------------------------------------------------ */
//       /* ENTERPRISE FALLBACK                              */
//       /* ------------------------------------------------ */

//       const fallbackResponses = [
//         "That's an interesting question. Unfortunately, I don't have enough information to answer it accurately.",

//         "I wasn't able to locate a precise answer in my current knowledge resources.",

//         "I want to ensure you receive accurate information, but I couldn't find a verified answer for your request.",

//         "I don't currently have enough information available to answer that confidently.",
//       ]

//       const fallback =
//         fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]

//       return {
//         reply: `${fallback}

// Would you like me to connect you with one of our support specialists? Simply reply "Yes" and I'll arrange that for you.`,
//         confidence: kbResult.confidenceScore ?? 0,
//         shouldEscalate: false,
//       }
//     } catch (error) {
//       logger.error(error, 'Error in AIService processing loop')
//       return {
//         reply:
//           'I am experiencing an internal communication update. Let me transfer you straight to a member of our human support team...',
//         confidence: 0,
//         shouldEscalate: true,
//       }
//     }
//   }

//   static shouldEscalate(confidence: number, threshold = 0.8) {
//     return confidence < threshold
//   }

//   static async updateSessionAutomationState(
//     sessionId: string,
//     aiEnabled: boolean,
//   ) {
//     const session = await ChatSession.findById(sessionId)
//     if (!session) {
//       throw new AppError('Target chat session could not be located.', 404)
//     }

//     session.aiEnabled = aiEnabled

//     if (!aiEnabled) {
//       session.aiHandled = false
//       if (!session.assignedOperatorId) {
//         session.status = 'queued'
//       }
//     } else {
//       session.aiEscalated = false
//     }

//     await session.save()

//     EventService.emitToProperty(
//       session.propertyId.toString(),
//       'dashboard_refresh_request',
//       {},
//     )

//     return {
//       sessionId: session._id,
//       aiEnabled: session.aiEnabled,
//       status: session.status,
//     }
//   }
// }

















// /src/services/ai.service.ts

import ChatSession from '../models/ChatSession.js'
import logger from '../bootstrap/logger.js'
import { AppError } from './appError.js'
import { EventService } from './event.service.js'
import { KnowledgeBaseService } from './knowledgeBase.service.js'

import { normalizeInput, randomResponse } from './ai/ai.utils.js'
import { fuzzyMatch } from './ai/ai.matcher.js'
import { enterpriseIntents } from './ai/ai.intents.js'
import { angryWords, sadWords } from './ai/ai.emotions.js'
import { humanWords, escalationResponses } from './ai/ai.escalation.js'
import { fallbackResponses } from './ai/ai.fallbacks.js'
import { createResponse } from './ai/ai.response.js'

export class AIService {
  static async generateReply(
    message: string,
    context: any[],
  ) {
    try {
      if (!context?.length) {
        return createResponse(
          "Hello and welcome! I'm your virtual assistant. How may I assist you today?",
        )
      }

      const session =
        await ChatSession.findById(
          context[0].sessionId,
        ).lean()

      if (!session) {
        return createResponse(
          "I couldn't establish your chat session properly. Let me connect you with support.",
          0,
          true,
        )
      }

      const propertyId =
        session.propertyId.toString()

      const cleanInput =
        normalizeInput(message)

      /* INTENTS */

      for (const intent of enterpriseIntents) {
        if (
          fuzzyMatch(
            cleanInput,
            intent.patterns,
          )
        ) {
          return createResponse(
            randomResponse(
              intent.responses,
            ),
          )
        }
      }

      /* EMOTIONS */

      if (
        angryWords.some(w =>
          cleanInput.includes(w),
        )
      ) {
        return createResponse(
          "I'm sorry this has been frustrating. I'd be happy to connect you with a support specialist.",
          1,
          true,
        )
      }

      if (
        sadWords.some(w =>
          cleanInput.includes(w),
        )
      ) {
        return createResponse(
          "I'm sorry you're going through that. I'll do my best to help.",
        )
      }

      /* HUMAN */

      if (
        humanWords.some(w =>
          cleanInput.includes(w),
        )
      ) {
        return createResponse(
          randomResponse(
            escalationResponses,
          ),
          1,
          true,
        )
      }

      /* KNOWLEDGE BASE */

      const kb =
        await KnowledgeBaseService.testSandboxQuery(
          '',
          propertyId,
          message,
        )

      const settings =
        await KnowledgeBaseService.getKnowledgeBase(
          '',
          propertyId,
        )

      const threshold =
        settings.confidenceThreshold ??
        0.8

      if (
        kb.matched &&
        kb.confidenceScore >= threshold
      ) {
        return createResponse(
          kb.answer,
          kb.confidenceScore,
        )
      }

      /* FALLBACK */

      return createResponse(
        `${randomResponse(
          fallbackResponses,
        )}

Would you like me to connect you with one of our support specialists?`,
        kb.confidenceScore ?? 0,
      )
    } catch (error) {
      logger.error(
        error,
        'AI service error',
      )

      return createResponse(
        'I am experiencing an internal communication issue. Let me connect you with our support team.',
        0,
        true,
      )
    }
  }

  static shouldEscalate(
    confidence: number,
    threshold = 0.8,
  ) {
    return confidence < threshold
  }

  static async updateSessionAutomationState(
    sessionId: string,
    aiEnabled: boolean,
  ) {
    const session =
      await ChatSession.findById(
        sessionId,
      )

    if (!session) {
      throw new AppError(
        'Target chat session could not be located.',
        404,
      )
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