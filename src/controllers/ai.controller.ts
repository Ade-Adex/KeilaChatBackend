// /src/controllers/ai.controller.ts
import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import { AIService } from '../services/ai.service.js'

/**
 * Handle manual operator overrides on the AI chat assistant state machine
 */
export const toggleSessionAI = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params
    const { aiEnabled } = req.body

    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError(
        'A valid string session ID path parameter is required.',
        400,
      )
    }

    if (typeof aiEnabled !== 'boolean') {
      throw new AppError(
        'The aiEnabled state parameter must be explicitly provided as a boolean.',
        400,
      )
    }

    const updatedSession = await AIService.updateSessionAutomationState(
      sessionId,
      aiEnabled,
    )

    res.status(200).json({
      success: true,
      message: `AI assistant successfully ${aiEnabled ? 'activated' : 'disabled'} for this conversation.`,
      data: updatedSession,
    })
  },
)
