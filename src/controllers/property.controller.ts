// /src/controllers/property.controller.ts
import type { Response } from 'express'

import { catchAsync } from '../config/errorHandler.js'
import { PropertyService } from '../services/property.service.js'

import type { AuthRequest } from '../middleware/auth.middleware.js'

interface PropertyParams {
  propertyId: string
}

/* -------------------------------------------------------------------------- */
/*                          GET WEBSITE SETTINGS                              */
/* -------------------------------------------------------------------------- */

export const getWebsiteSettings = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const accountId = req.headers['x-account-id'] as string

    const property = await PropertyService.getWebsiteSettings(accountId)

    res.status(200).json({
      success: true,
      data: {
        property,
      },
    })
  },
)
/* -------------------------------------------------------------------------- */
/*                        UPDATE WEBSITE SETTINGS                             */
/* -------------------------------------------------------------------------- */

export const updateWebsiteSettings = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const accountId = req.headers['x-account-id'] as string

    const property = await PropertyService.updateWebsiteSettings(
      accountId,
      req.body,
    )

    res.status(200).json({
      success: true,
      message: 'Website settings updated successfully',
      data: {
        property,
      },
    })
  },
)

/* -------------------------------------------------------------------------- */
/*                          GET PROPERTY DETAILS                              */
/* -------------------------------------------------------------------------- */

export const getPropertyDetails = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { propertyId } = req.params

    if (typeof propertyId !== 'string') {
      throw new Error('Invalid property id')
    }

    const property = await PropertyService.getPropertyDetails(propertyId)

    res.status(200).json({
      success: true,
      data: {
        id: property._id.toString(),
        widgetId: property.widgetId,
        name: property.name,
        domain: property.domain,
        allowedDomains: property.allowedDomains,
        details: property.details,
        settings: property.settings,
        workingHours: property.workingHours,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
      },
    })
  },
)


// Add this export to your /src/controllers/property.controller.ts file

/* -------------------------------------------------------------------------- */
/* GET OPERATOR PROPERTIES                           */
/* -------------------------------------------------------------------------- */

export const getMyProperties = catchAsync(
  async (req: AuthRequest, res: Response) => {
    // Rely on your tenant/auth middleware injected header context safely
    const accountId = req.headers['x-account-id'] as string

    if (!accountId) {
      res.status(200).json({ success: true, data: [] })
      return
    }

    // Pass account context into your service layout layer
    const properties = await PropertyService.getWebsiteSettings(accountId)
    
    // Normalize into an array match format if your service returns a single document block
    const propertiesArray = properties ? [properties] : []

    res.status(200).json({
      success: true,
      data: propertiesArray,
    })
  },
)