// /src/services/property.service.ts

import mongoose from 'mongoose'

import logger from '../bootstrap/logger.js'
import Property from '../models/Property.js'
import { AppError } from './appError.js'
import { generatePropertyCredentials } from '../utils/property/credentials.js'

export class PropertyService {
  /**
   * Get Website Settings
   */
  static async getWebsiteSettings(accountId: string) {
    const property = await Property.findOne({
      accountId,
    }).select('-apiKey')

    logger.info(
      {
        accountId,
      },
      'Loading website settings',
    )

    if (!property) {
      throw new AppError('Property not found', 404)
    }

    return property
  }

  /**
   * Update Website Settings
   * Creates the property if it does not already exist.
   */
  static async updateWebsiteSettings(
    accountId: string,
    data: {
      name: string
      domain: string
      aiName: string
      allowedDomains: string[]
      category: string
      subCategory: string
      region: string
      description: string
      logoUrl: string
    },
  ) {
    logger.info({ accountId }, 'Updating website settings')

    let property = await Property.findOne({ accountId })

    const credentials = generatePropertyCredentials()

    /* ---------------------------------------------------------------------- */
    /* First setup: create property if it doesn't exist                        */
    /* ---------------------------------------------------------------------- */

    if (!property) {
      logger.info({ accountId }, 'No property found. Creating a new property.')

      property = await Property.create({
        accountId,

        name: data.name,
        domain: data.domain,
        allowedDomains: data.allowedDomains,

        widgetId: credentials.widgetId,
        apiKey: credentials.apiKey,
        widgetSettings: {
          aiName: data.aiName || 'AI Assistant',
        },

        details: {
          category: data.category,
          subCategory: data.subCategory,
          region: data.region,
          description: data.description,
          logoUrl: data.logoUrl,
        },
      })

      logger.info(
        {
          accountId,
          propertyId: property._id,
        },
        'Property created successfully',
      )

      return property
    }

    /* ---------------------------------------------------------------------- */
    /* Existing property: update                                               */
    /* ---------------------------------------------------------------------- */

    property.name = data.name
    property.domain = data.domain
    property.allowedDomains = data.allowedDomains

    property.widgetSettings = {
      ...(property.widgetSettings ?? {}),
      aiName: data.aiName,
    }

    property.details = {
      ...(property.details ?? {}),
      category: data.category,
      subCategory: data.subCategory,
      region: data.region,
      description: data.description,
      logoUrl: data.logoUrl,
    }

    await property.save()

    logger.info(
      {
        accountId,
        propertyId: property._id,
      },
      'Website settings updated successfully',
    )

    return property
  }


  /**
   * Get Property Details
   */
  static async getPropertyDetails(propertyId: string) {
    if (!propertyId) {
      throw new AppError('Property ID is required.', 400)
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new AppError('Invalid Property ID.', 400)
    }

    logger.info(
      {
        propertyId,
      },
      'Loading property details',
    )

    const property = await Property.findById(propertyId).lean()

    if (!property) {
      throw new AppError('Property not found.', 404)
    }

    return property
  }
}
