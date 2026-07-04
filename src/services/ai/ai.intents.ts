// /src/services/ai/ai.intents.ts

import type { AIIntent } from './ai.types.js'

export const enterpriseIntents: AIIntent[] = [
  {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good evening'],
    responses: [
      'Hello! Welcome. How may I assist you today?',
      "Hi there! It's great to hear from you.",
      'Hello and thank you for reaching out.',
    ],
  },

  {
    patterns: ['who are you', 'who r u', 'what are you', 'who is this'],
    responses: [
      "I'm an AI-powered virtual assistant designed to provide professional support.",
      "I'm your virtual assistant and I'm here to help.",
    ],
  },

  {
    patterns: ['how are you', 'how are you doing'],
    responses: [
      "I'm doing great and ready to assist.",
      'Thank you for asking. How can I help?',
    ],
  },

  {
    patterns: ['tell me a joke', 'make me laugh'],
    responses: [
      'Why do developers prefer dark mode? Because light attracts bugs.',
      'Why was the developer broke? Because they used up all their cache.',
    ],
  },

  {
    patterns: ['i love you', 'do you love me'],
    responses: ["That's very kind of you. I'm always happy to help."],
  },
]
