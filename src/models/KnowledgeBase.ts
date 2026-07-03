//  /src/models/KnowledgeBase.ts

import mongoose, { Schema, model, type Model } from 'mongoose'
import type { IKnowledgeBase, IFaqItem } from '../types/knowledgeBase.types.js'

/**
 * FAQ Item Schema Definitions
 */
const FaqItemSchema = new Schema<IFaqItem>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },

    answer: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      default: 'General',
      trim: true,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    priority: {
      type: Number,
      default: 1,
    },

    keywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  },
)

/**
 * Knowledge Base Root Document Schema Structure
 */
const KnowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      unique: true,
      index: true,
    },

    isAiEnabled: {
      type: Boolean,
      default: true,
    },

    aiMode: {
      type: String,
      enum: ['disabled', 'knowledge_only', 'hybrid'],
      default: 'knowledge_only',
    },

    confidenceThreshold: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8,
    },

    fallbackStrategy: {
      type: String,
      enum: ['human', 'clarify', 'fallback'],
      default: 'human',
    },

    humanHandoffEnabled: {
      type: Boolean,
      default: true,
    },

    fallbackMessage: {
      type: String,
      default:
        'Sorry, I could not find an answer. A human agent will assist you shortly.',
      trim: true,
    },

    welcomeMessage: {
      type: String,
      default: 'Hi 👋 How can I help you today?',
      trim: true,
    },

    maxResults: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
    },

    categories: [
      {
        type: String,
        trim: true,
      },
    ],

    lastIndexedAt: {
      type: Date,
    },

    faqs: [FaqItemSchema],
  },
  {
    timestamps: true,
  },
)

/**
 * Composite Evaluation Performance Query Indexes
 */
KnowledgeBaseSchema.index({
  accountId: 1,
  propertyId: 1,
})

KnowledgeBaseSchema.index({
  accountId: 1,
  isAiEnabled: 1,
})

export default (mongoose.models?.KnowledgeBase ||
  model<IKnowledgeBase>(
    'KnowledgeBase',
    KnowledgeBaseSchema,
  )) as Model<IKnowledgeBase>
