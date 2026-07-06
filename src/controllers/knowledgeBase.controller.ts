// /src/controllers/knowledgeBase.controller.ts

import type { Response } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { KnowledgeBaseService } from '../services/knowledgeBase.service.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { AppError } from '../services/appError.js'
import Property from '../models/Property.js'
import KnowledgeBase from '../models/KnowledgeBase.js'
import { scrapeWebpage } from '../services/scraper.service.js'

export const getSettings = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const accountId =
      req.user?.accountId || (req.headers['x-account-id'] as string)
    let propertyId = req.headers['x-property-id'] as string

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
        'Could not locate an active target property workspace context.',
        400,
      )
    }

    const knowledgeBase = await KnowledgeBaseService.getKnowledgeBase(
      accountId,
      propertyId,
    )
    res.status(200).json({ success: true, data: knowledgeBase })
  },
)

export const updateSettings = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const accountId =
      req.user?.accountId || (req.headers['x-account-id'] as string)
    let propertyId = req.headers['x-property-id'] as string

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
        'Could not locate an active target property workspace context.',
        400,
      )
    }

    const knowledgeBase = await KnowledgeBaseService.updateKnowledgeBase(
      accountId,
      propertyId,
      req.body,
    )

    res.status(200).json({
      success: true,
      message: 'Knowledge base configurations updated successfully',
      data: knowledgeBase,
    })
  },
)

export const testPlayground = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const accountId =
      req.user?.accountId || (req.headers['x-account-id'] as string)
    let propertyId = req.headers['x-property-id'] as string
    const { message } = req.body

    if (!message?.trim()) {
      throw new AppError(
        'A valid search query message parameter is required.',
        400,
      )
    }

    if (!propertyId && accountId) {
      const defaultProperty = await Property.findOne({ accountId })
        .sort({ createdAt: 1 })
        .lean()
      if (defaultProperty) {
        propertyId = defaultProperty._id.toString()
      }
    }

    const result = await KnowledgeBaseService.testSandboxQuery(
      accountId,
      propertyId,
      message,
    )
    res.status(200).json(result)
  },
)

export const crawlPropertyUrls = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const accountId =
      req.user?.accountId || (req.headers['x-account-id'] as string)
    let propertyId = req.headers['x-property-id'] as string
    const { urls } = req.body

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
        'Could not locate an active target property workspace context.',
        400,
      )
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new AppError(
        'A valid non-empty array of source URLs is required.',
        400,
      )
    }

    let kb = await KnowledgeBase.findOne({ propertyId })
    if (!kb) {
      throw new AppError(
        'Knowledge Base configuration not found for this property.',
        404,
      )
    }

    res.status(202).json({
      success: true,
      message: 'Web page crawling process started successfully.',
    })

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

      const result = await scrapeWebpage(targetUrl)
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
              const rawParagraphs = result.rawContent
                .split(/\n+/)
                .map((p) => p.trim())
                .filter((p) => p.length > 10)

              const chunksToSave: string[] = []
              let currentWindow = ''

              for (const paragraph of rawParagraphs) {
                if (
                  (currentWindow + ' ' + paragraph).split(/\s+/).length < 60
                ) {
                  currentWindow = (currentWindow + ' ' + paragraph).trim()
                } else {
                  if (currentWindow.length > 0) chunksToSave.push(currentWindow)
                  currentWindow = paragraph
                }
              }
              if (currentWindow.length > 0) chunksToSave.push(currentWindow)

              const { createEmbedding } =
                await import('../services/ai/ai.embeddings.js')

              for (const textChunk of chunksToSave) {
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

export const deleteCrawledSource = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const propertyId = req.headers['x-property-id'] as string
    const { url } = req.body

    if (!propertyId || !url) {
      throw new AppError(
        'Missing required property validation identifier parameters.',
        400,
      )
    }

    const kb = await KnowledgeBase.findOneAndUpdate(
      { propertyId },
      { $pull: { crawledSources: { url } } },
      { new: true },
    )

    if (!kb) {
      throw new AppError(
        'Failed to locate target document profile context matrix.',
        404,
      )
    }

    res.status(200).json({
      success: true,
      message:
        'Source document successfully un-indexed from workspace database.',
      data: kb,
    })
  },
)