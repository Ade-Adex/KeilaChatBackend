//  /src/models/KnowledgeBase.ts

import mongoose, { Schema, model, type Model } from 'mongoose'
import type { IKnowledgeBase, IFaqItem, ICrawledSource } from '../types/knowledgeBase.types.js'

/**
 * 🎯 FIXED: Explicitly typed with <ICrawledSource>
 */
const CrawledSourceSchema = new Schema<ICrawledSource>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    rawContent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'scraped', 'failed'],
      default: 'pending',
    },
    lastScrapedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

/**
 * 🎯 FIXED: Explicitly typed with <IFaqItem>
 */
const FaqItemSchema = new Schema<IFaqItem>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },
    keywords: [{ type: String, trim: true, lowercase: true }],
    intent: { type: String, default: 'unknown', lowercase: true, index: true },
    entities: [{ type: String, lowercase: true, trim: true }],
    embedding: [{ type: Number }],
    embeddingModel: { type: String, default: 'Xenova/all-MiniLM-L6-v2' },
    usageCount: { type: Number, default: 0 },
    lastMatchedAt: { type: Date },
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
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, unique: true, index: true },
    isAiEnabled: { type: Boolean, default: true },
    aiMode: { type: String, enum: ['disabled', 'knowledge_only', 'hybrid'], default: 'knowledge_only' },
    confidenceThreshold: { type: Number, min: 0, max: 1, default: 0.8 },
    fallbackStrategy: { type: String, enum: ['human', 'clarify', 'fallback'], default: 'human' },
    humanHandoffEnabled: { type: Boolean, default: true },
    fallbackMessage: { type: String, default: 'Sorry, I could not find an answer...', trim: true },
    welcomeMessage: { type: String, default: 'Hi 👋 How can I help you today?', trim: true },
    maxResults: { type: Number, default: 3, min: 1, max: 10 },
    categories: [{ type: String, trim: true }],
    lastIndexedAt: { type: Date },
    
    faqs: [FaqItemSchema],
    
    // 🎯 CLEAN & SAFE: TypeScript compiles this natively now without "as any"
    crawledSources: [CrawledSourceSchema],
  },
  {
    timestamps: true,
  },
)

KnowledgeBaseSchema.index({ accountId: 1, propertyId: 1 })
KnowledgeBaseSchema.index({ accountId: 1, isAiEnabled: 1 })
KnowledgeBaseSchema.index({ propertyId: 1, 'faqs.intent': 1 })
KnowledgeBaseSchema.index({ propertyId: 1, 'faqs.category': 1 })
KnowledgeBaseSchema.index({ propertyId: 1, 'faqs.enabled': 1 })
KnowledgeBaseSchema.index({ propertyId: 1, 'crawledSources.url': 1 })

export default (mongoose.models?.KnowledgeBase ||
  model<IKnowledgeBase>(
    'KnowledgeBase',
    KnowledgeBaseSchema,
  )) as Model<IKnowledgeBase>