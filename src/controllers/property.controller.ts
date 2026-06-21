// /src/controllers/property.controller.ts

import type { Request, Response, NextFunction } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import { AppError } from '../services/appError.js'
import Property from '../models/Property.js'
import mongoose from 'mongoose'

export const getPropertyDetails = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { propertyId } = req.params

    console.log('Incoming Property Query ID Request:', propertyId)

    // 1. Structural Guards
    if (!propertyId || typeof propertyId !== 'string') {
      return next(new AppError('Property ID parameter is required.', 400))
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return next(new AppError('Invalid Property ID verification format.', 400))
    }

    // 2. Fetch data cleanly via lean queries
    const property = await Property.findById(propertyId).lean()

    if (!property) {
      return next(new AppError('Requested property resource not found.', 404))
    }

    // 3. CORRECTION: Format the response shape to match your frontend types explicitly
    res.status(200).json({
      status: 'success',
      data: {
        id: property._id.toString(), // Convert MongoDB _id to frontend-friendly id string
        widgetId: property.widgetId,
        name: property.name,
        domain: property.domain,
        details: property.details,
        settings: property.settings,
      },
    })
  },
)
