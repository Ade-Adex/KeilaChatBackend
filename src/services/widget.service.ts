// /src/services/widget.service.ts

import Account from '../models/Account.js'
import Operator from '../models/Operator.js'
import Property from '../models/Property.js'
import Visitor from '../models/Visitor.js'

import { AppError } from './appError.js'
import { normalizeDomain } from '../utils/domain.utils.js'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface WidgetInitializationResult {
  property: any
  account: any
  onlineOperators: number
  visitor: any | null

  widgetSettings: {
    launcherPosition: string
    launcherIcon?: string
    welcomeMessage: string
    offlineMessage: string
    showAgentPhoto: boolean
    soundEnabled: boolean
    allowFileUpload: boolean
    allowEmoji: boolean
    allowScreenshots: boolean
  }

  isOnline: boolean
}

export interface WidgetVerificationResult {
  property: any
  account: any
}

/* -------------------------------------------------------------------------- */
/* Property Lookup                                                            */
/* -------------------------------------------------------------------------- */

export async function getPropertyByWidgetId(widgetId: string) {
  const property = await Property.findOne({
    widgetId,
  }).lean()

  if (!property) {
    throw new AppError(
      'Invalid widget configuration. Please verify your widget identifier.',
      404,
    )
  }

  return property
}

/* -------------------------------------------------------------------------- */
/* Account Validation                                                         */
/* -------------------------------------------------------------------------- */

export async function validateAccount(accountId: string) {
  const account = await Account.findById(accountId).lean()

  if (!account) {
    throw new AppError(
      'The workspace associated with this widget no longer exists.',
      404,
    )
  }

  if (!account.isActive) {
    throw new AppError(
      'This workspace has been suspended or is currently inactive.',
      403,
    )
  }

  return account
}

/* -------------------------------------------------------------------------- */
/* Property Validation                                                        */
/* -------------------------------------------------------------------------- */

export async function validateProperty(property: any) {
  if (!property) {
    throw new AppError('Unable to load widget configuration.', 404)
  }

  if (!property.widgetId) {
    throw new AppError('Widget configuration is incomplete.', 500)
  }

  if (!property.accountId) {
    throw new AppError('Widget is not linked to an active workspace.', 500)
  }

  if (!property.settings?.onlineStatus) {
    throw new AppError(
      'This chat widget has been disabled by the workspace administrator.',
      403,
    )
  }

  return property
}

/* -------------------------------------------------------------------------- */
/* Domain Validation                                                          */
/* -------------------------------------------------------------------------- */

export async function validateWidgetDomain(property: any, origin?: string) {
  const requestHostname = normalizeDomain(origin)

  const registeredHostname = normalizeDomain(property.domain)

  const allowedDomains = [
    registeredHostname,
    ...(property.allowedDomains ?? []).map((domain: string) =>
      normalizeDomain(domain),
    ),
  ].filter(Boolean)

  if (!requestHostname) {
    throw new AppError('Unable to determine the requesting domain.', 403)
  }

  if (!allowedDomains.includes(requestHostname)) {
    throw new AppError(
      'This widget is not authorized to run on this domain.',
      403,
    )
  }

  return true
}

/* -------------------------------------------------------------------------- */
/* Online Operator Status                                                     */
/* -------------------------------------------------------------------------- */

export async function getOnlineOperatorCount(accountId: string) {
  return Operator.countDocuments({
    accountId,
    isOnline: true,
    status: 'active',
  })
}

/* -------------------------------------------------------------------------- */
/* Visitor Management                                                         */
/* -------------------------------------------------------------------------- */

export async function createOrUpdateVisitor(
  propertyId: string,
  visitorTrackingId?: string,
) {
  if (!visitorTrackingId) {
    return null
  }

  const visitor = await Visitor.findOneAndUpdate(
    {
      propertyId,
      visitorTrackingId,
    },
    {
      $set: {
        lastSeen: new Date(),
      },

      $setOnInsert: {
        name: 'Anonymous Visitor',
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).lean()

  return visitor
}

/* -------------------------------------------------------------------------- */
/* Widget Initialization                                                      */
/* -------------------------------------------------------------------------- */

export async function initializeWidgetSession(
  widgetId: string,
  visitorTrackingId?: string,
  origin?: string,
): Promise<WidgetInitializationResult> {
  /* ------------------------------------ */
  /* Property                             */
  /* ------------------------------------ */

  const property = await getPropertyByWidgetId(widgetId)

  /* ------------------------------------ */
  /* Account                              */
  /* ------------------------------------ */

  const account = await validateAccount(property.accountId.toString())

  /* ------------------------------------ */
  /* Property Validation                  */
  /* ------------------------------------ */

  await validateProperty(property)

  /* ------------------------------------ */
  /* Domain Validation                    */
  /* ------------------------------------ */

  await validateWidgetDomain(property, origin)

  /* ------------------------------------ */
  /* Parallel Operations                  */
  /* ------------------------------------ */

  const [onlineOperators, visitor] = await Promise.all([
    getOnlineOperatorCount(property.accountId.toString()),

    createOrUpdateVisitor(property._id.toString(), visitorTrackingId),
  ])

  const isOnline = onlineOperators > 0 && property.settings.onlineStatus

  return {
    property,
    account,
    onlineOperators,
    visitor,

    widgetSettings: property.widgetSettings,

    isOnline,
  }
}

/* -------------------------------------------------------------------------- */
/* Widget Verification                                                        */
/* -------------------------------------------------------------------------- */

export async function verifyWidgetAccess(
  widgetId: string,
  origin?: string,
): Promise<WidgetVerificationResult> {
  const property = await getPropertyByWidgetId(widgetId)

  const account = await validateAccount(property.accountId.toString())

  await validateProperty(property)

  await validateWidgetDomain(property, origin)

  return {
    property,
    account,
  }
}

/* -------------------------------------------------------------------------- */
/* Widget Response Builder                                                    */
/* -------------------------------------------------------------------------- */

export function buildWidgetResponse(
  property: any,
  onlineOperators: number,
  visitor: any,
) {
  const isOnline = onlineOperators > 0 && property.settings.onlineStatus

  return {
    status: 'success',

    message: 'Widget initialized successfully.',

    data: {
      widget: {
        id: property.widgetId,

        version: '1.0.0',

        initialized: true,

        launcherPosition: property.widgetSettings.launcherPosition,

        launcherIcon: property.widgetSettings.launcherIcon,
      },

      property: {
        id: property._id,

        name: property.name,

        logo: property.details?.logoUrl,

        category: property.details?.category,
      },

      chat: {
        online: isOnline,

        operators: onlineOperators,

        welcomeMessage: isOnline
          ? property.widgetSettings.welcomeMessage
          : property.widgetSettings.offlineMessage,

        allowFileUpload: property.widgetSettings.allowFileUpload,

        allowEmoji: property.widgetSettings.allowEmoji,

        allowScreenshots: property.widgetSettings.allowScreenshots,

        soundEnabled: property.widgetSettings.soundEnabled,

        showAgentPhoto: property.widgetSettings.showAgentPhoto,
      },

      visitor: visitor
        ? {
            id: visitor._id,

            trackingId: visitor.visitorTrackingId,

            name: visitor.name,

            pageViews: visitor.pageViews,
          }
        : null,

      system: {
        apiVersion: 'v1',

        serverTime: new Date().toISOString(),
      },
    },
  }
}

/* -------------------------------------------------------------------------- */
/* Widget status helper                                                    */
/* -------------------------------------------------------------------------- */
export async function getWidgetStatus(widgetId: string) {
  const property = await getPropertyByWidgetId(widgetId)

  const onlineOperators = await getOnlineOperatorCount(
    property.accountId.toString(),
  )

  return {
    online: onlineOperators > 0 && property.settings.onlineStatus,

    operators: onlineOperators,

    welcomeMessage: property.widgetSettings.welcomeMessage,

    offlineMessage: property.widgetSettings.offlineMessage,
  }
}

/* -------------------------------------------------------------------------- */
/* Widget typing presence update                                                  */
/* -------------------------------------------------------------------------- */

export async function updateVisitorPresence(
  visitorTrackingId: string,
  propertyId: string,
) {
  return Visitor.updateOne(
    {
      visitorTrackingId,
      propertyId,
    },
    {
      $set: {
        isOnline: true,
        lastSeen: new Date(),
      },
    },
  )
}

/* -------------------------------------------------------------------------- */
/* widget analytics tracking                                               */
/* -------------------------------------------------------------------------- */

export async function trackWidgetOpen(propertyId: string) {
  return Property.updateOne(
    {
      _id: propertyId,
    },
    {
      $inc: {
        'usage.totalChats': 1,
      },
    },
  )
}