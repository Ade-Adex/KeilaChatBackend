// /src/controllers/media.controller.ts

import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import { MediaService } from '../services/media.service.js'

export const uploadMedia = catchAsync(
  async (
    req: Request, // 🎯 Keep this standard to make catchAsync happy
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Cast safely inside to get full access to the multer file object
    const multerReq = req as any

    if (!multerReq.file) {
      return next(new AppError('No file attachment payload detected.', 400))
    }

    // Pass the buffer and mimetype through to Cloudinary
    const liveUrl = await MediaService.uploadToCloud(
      multerReq.file.buffer,
      multerReq.file.mimetype,
    )

    res.status(200).json({
      status: 'success',
      url: liveUrl,
    })
  },
)