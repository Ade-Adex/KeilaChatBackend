import type { Response } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { KnowledgeBaseService } from '../services/knowledgeBase.service.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { AppError } from '../services/appError.js'
import Property from '../models/Property.js' // 🎯 Import the Property model

/* -------------------------------------------------------------------------- */
/* GET KNOWLEDGE BASE SETTINGS                                               */
/* -------------------------------------------------------------------------- */
export const getSettings = catchAsync(
  async (req: AuthRequest, res: Response) => {
    // 1. Pull accountId from authMiddleware token context instead of header tracking
    const accountId =
      req.user?.accountId || (req.headers['x-account-id'] as string)
    let propertyId = req.headers['x-property-id'] as string

    // 2. 🧠 Smart Auto-Lookup: If frontend didn't pass an ID, grab the first property assigned to this account
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

    const knowledgeBase = await KnowledgeBaseService.getKnowledgeBase(
      accountId,
      propertyId,
    )

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
    const accountId =
      req.user?.accountId || (req.headers['x-account-id'] as string)
    let propertyId = req.headers['x-property-id'] as string

    // Smart Auto-Lookup fallback on save updates too
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
    const accountId = req.user?.accountId || (req.headers['x-account-id'] as string);
    let propertyId = req.headers['x-property-id'] as string;
    const { message } = req.body;

    if (!message?.trim()) {
      throw new AppError('A valid search query message parameter is required.', 400);
    }

    // Dynamic resolution fallback block if header parameter isn't populated
    if (!propertyId && accountId) {
      const defaultProperty = await Property.findOne({ accountId }).sort({ createdAt: 1 }).lean();
      if (defaultProperty) {
        propertyId = defaultProperty._id.toString();
      }
    }

    // 🎯 Clean Delegation down to the service layer orchestration line
    const result = await KnowledgeBaseService.testSandboxQuery(
      accountId,
      propertyId,
      message
    );

    return res.status(200).json(result);
  }
);