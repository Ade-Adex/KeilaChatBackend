// /src/controllers/knowledgeBase.controller.ts

import type { Response } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { KnowledgeBaseService } from '../services/knowledgeBase.service.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { AppError } from '../services/appError.js'
import Property from '../models/Property.js'
import KnowledgeBase from '../models/KnowledgeBase.js' // 🎯 Import your KnowledgeBase model
import { scrapeWebpage } from '../services/scraper.service.js' // 🎯 Import your scraper engine

/* -------------------------------------------------------------------------- */
/* GET KNOWLEDGE BASE SETTINGS                                               */
/* -------------------------------------------------------------------------- */
export const getSettings = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const accountId = req.user?.accountId || (req.headers['x-account-id'] as string)
    let propertyId = req.headers['x-property-id'] as string

    if (!propertyId && accountId) {
      const defaultProperty = await Property.findOne({ accountId }).sort({ createdAt: 1 }).lean()
      if (defaultProperty) {
        propertyId = defaultProperty._id.toString()
      }
    }

    if (!propertyId) {
      throw new AppError('Could not locate an active target property workspace context for this account.', 400)
    }

    const knowledgeBase = await KnowledgeBaseService.getKnowledgeBase(accountId, propertyId)

    res.status(200).json({
      success: true,
      data: knowledgeBase,
    })
  },
)

/* -------------------------------------------------------------------------- */
/* UPDATE KNOWLEDGE BASE SETTINGS                                            */
/* -------------------------------------------------------------------------- */
export const updateSettings = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const accountId = req.user?.accountId || (req.headers['x-account-id'] as string)
    let propertyId = req.headers['x-property-id'] as string

    if (!propertyId && accountId) {
      const defaultProperty = await Property.findOne({ accountId }).sort({ createdAt: 1 }).lean()
      if (defaultProperty) {
        propertyId = defaultProperty._id.toString()
      }
    }

    if (!propertyId) {
      throw new AppError('Could not locate an active target property workspace context for this account.', 400)
    }

    const {
      isAiEnabled,
      aiMode,
      confidenceThreshold,
      fallbackStrategy,
      humanHandoffEnabled,
      fallbackMessage,
      welcomeMessage,
      maxResults,
      categories,
      faqs,
    } = req.body

    const knowledgeBase = await KnowledgeBaseService.updateKnowledgeBase(
      accountId,
      propertyId,
      {
        isAiEnabled,
        aiMode,
        confidenceThreshold,
        fallbackStrategy,
        humanHandoffEnabled,
        fallbackMessage,
        welcomeMessage,
        maxResults,
        categories,
        faqs,
      },
    )

    res.status(200).json({
      success: true,
      message: 'Knowledge base configurations updated successfully',
      data: knowledgeBase,
    })
  },
)

/* -------------------------------------------------------------------------- */
/* SEMANTIC PLAYGROUND SIMULATION SEARCH ROUTE                                */
/* -------------------------------------------------------------------------- */
export const testPlayground = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const accountId = req.user?.accountId || (req.headers['x-account-id'] as string)
    let propertyId = req.headers['x-property-id'] as string
    const { message } = req.body

    if (!message?.trim()) {
      throw new AppError('A valid search query message parameter is required.', 400)
    }

    if (!propertyId && accountId) {
      const defaultProperty = await Property.findOne({ accountId }).sort({ createdAt: 1 }).lean()
      if (defaultProperty) {
        propertyId = defaultProperty._id.toString()
      }
    }

    const result = await KnowledgeBaseService.testSandboxQuery(accountId, propertyId, message)
    return res.status(200).json(result)
  },
)

/* -------------------------------------------------------------------------- */
/* CRAWL PROPERTY URLS ROUTE                                                 */
/* -------------------------------------------------------------------------- */
export const crawlPropertyUrls = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const accountId =
      req.user?.accountId || (req.headers['x-account-id'] as string)
    let propertyId = req.headers['x-property-id'] as string
    const { urls } = req.body

    // 1. Resolve workspace context cleanly with your Smart Auto-Lookup
    if (!propertyId && accountId) {
      const defaultProperty = await Property.findOne({ accountId })
        .sort({ createdAt: 1 })
        .lean()
      if (defaultProperty) {
        propertyId = defaultProperty._id.toString()
      }
    }

    if (!propertyId) {
      throw new AppError(
        'Could not locate an active target property workspace context for this account.',
        400,
      )
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new AppError(
        'A valid non-empty array of source URLs is required.',
        400,
      )
    }

    // 2. Locate the existing Knowledge Base document context for this property
    let kb = await KnowledgeBase.findOne({ propertyId })
    if (!kb) {
      throw new AppError(
        'Knowledge Base configuration not found for this property.',
        404,
      )
    }

    // 3. Immediately respond with a 202 Accepted so the client frame isn't left hanging
    res.status(202).json({
      success: true,
      message: 'Web page crawling process started successfully.',
    })

    // 4. Background Processing Execution Loop
    for (const urlString of urls) {
      const targetUrl = urlString.trim()
      if (!targetUrl) continue

      const existingSourceIndex = kb.crawledSources.findIndex(
        (s) => s.url === targetUrl,
      )

      if (existingSourceIndex !== -1) {
        const existingSource = kb.crawledSources[existingSourceIndex]
        if (existingSource) {
          existingSource.status = 'pending'
          existingSource.errorMessage = ''
          existingSource.chunks = []
        }
      } else {
        kb.crawledSources.push({
          url: targetUrl,
          title: '',
          rawContent: 'Processing index queue...',
          status: 'pending',
          errorMessage: '',
          lastScrapedAt: new Date(),
          chunks: [],
        })
      }

      await kb.save()

      // 5. Execute Scraper Worker Logic
      const result = await scrapeWebpage(targetUrl)

      // Reload fresh document instance to account for mid-flight parallel mutations
      kb = (await KnowledgeBase.findOne({ propertyId })) || kb
      const updateIndex = kb.crawledSources.findIndex(
        (s) => s.url === targetUrl,
      )

      if (updateIndex !== -1) {
        const sourceToUpdate = kb.crawledSources[updateIndex]
        if (sourceToUpdate) {
          sourceToUpdate.title = result.title
          sourceToUpdate.rawContent = result.rawContent || ''
          sourceToUpdate.status = result.success ? 'scraped' : 'failed'
          sourceToUpdate.lastScrapedAt = new Date()
          sourceToUpdate.chunks = []

          if (result.success && result.rawContent) {
            try {
              // Split text cleanly by sentence double-breaks or periods
              const paragraphs = result.rawContent
                .split(/\n\s*\n|\.\s+/)
                .map((p) => p.trim())
                .filter((p) => p.length > 20)

              const { createEmbedding } =
                await import('../services/ai/ai.embeddings.js')

              for (const textChunk of paragraphs) {
                const vector = await createEmbedding(textChunk)
                sourceToUpdate.chunks.push({
                  text: textChunk,
                  embedding: vector,
                })
              }
            } catch (embedError) {
              const msg =
                embedError instanceof Error
                  ? embedError.message
                  : 'Embedding error'
              sourceToUpdate.status = 'failed'
              sourceToUpdate.errorMessage = `Embedding generation error: ${msg}`
            }
          } else if (!result.success) {
            sourceToUpdate.errorMessage =
              'Web page unreachable or scraper blocked.'
          }

          await kb.save()
        }
      }
    }
  },
)

