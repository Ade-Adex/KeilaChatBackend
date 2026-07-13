// /src/services/widget.service.ts

import Account from '../models/Account.js'
import Operator from '../models/Operator.js'
import Property from '../models/Property.js'
import Visitor from '../models/Visitor.js'

import { AppError } from './appError.js'
import { normalizeDomain } from '../utils/domain.utils.js'
import { generateVisitorTrackingId } from '../utils/visitor/identity.js'


import useragent from 'useragent'
import geoip from 'geoip-lite'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface WidgetInitializationResult {
  property: any
  account: any
  onlineOperators: number
  visitor: any | null

  widgetSettings: {
    aiName?: string | undefined
    launcherPosition: string
    launcherIcon?: string | undefined
    welcomeMessage: string
    offlineMessage: string
    showAgentPhoto: boolean
    soundEnabled: boolean
    allowFileUpload: boolean
    allowEmoji: boolean
    allowScreenshots: boolean
    allowVoiceRecordings: boolean
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


export async function createOrUpdateVisitor(
  propertyId: string,
  visitorTrackingId?: string,
  clientMetadata?: {
    userAgent: string
    language: string
    screenResolution: string
    timezone: string
  },
  reqIp?: string
) {
  try {
    const trackingIdToUse =
      visitorTrackingId &&
      visitorTrackingId !== 'undefined' &&
      visitorTrackingId.trim() !== ''
        ? visitorTrackingId
        : generateVisitorTrackingId()

    const uaString = clientMetadata?.userAgent || ''
    
    // 1️⃣ Parse User-Agent using the package
    const agent = useragent.parse(uaString)
    const browser = agent.toAgent() // e.g., "Chrome 124.0.0"
    const operatingSystem = agent.os.toString() // e.g., "Windows 11"

    // 2️⃣ Device classification logic
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'
    if (/Mobi|Android|iPhone/i.test(uaString)) {
      deviceType = 'mobile'
    } else if (/Tablet|iPad/i.test(uaString)) {
      deviceType = 'tablet'
    }

    // 3️⃣ Clean Local IP Addresses for GeoIP and lookup geo-data
    let cleanIp = reqIp || '127.0.0.1'
    if (cleanIp === '::1' || cleanIp === '::ffff:127.0.0.1') {
      cleanIp = '127.0.0.1'
    } else if (cleanIp.startsWith('::ffff:')) {
      cleanIp = cleanIp.replace('::ffff:', '')
    }

    let country = 'Unknown'
    let city = 'Unknown'

    // Only lookup public IPs
    if (cleanIp !== '127.0.0.1') {
      const geo = geoip.lookup(cleanIp)
      if (geo) {
        country = geo.country || 'Unknown'
        city = geo.city || 'Unknown'
      }
    }

    // 4️⃣ Construct the structured nested object mapped to your Visitor.ts Schema
    const visitorMetadata = {
      ipAddress: cleanIp,
      userAgent: uaString,
      browser,
      operatingSystem,
      timezone: clientMetadata?.timezone || 'UTC',
      language: clientMetadata?.language || 'en',
      screenResolution: clientMetadata?.screenResolution || 'Unknown',
      deviceType,
      location: {
        country,
        city,
      },
    }

    // 5️⃣ Update document with the complete dataset
    const visitor = await Visitor.findOneAndUpdate(
      {
        propertyId,
        visitorTrackingId: trackingIdToUse,
      },
      {
        $inc: { pageViews: 1 },
        $set: { 
          lastSeen: new Date(),
          metadata: visitorMetadata,
          // Sync surface parameters if needed
          currentPage: clientMetadata ? undefined : undefined // Can be mapped to track routes
        },
        $setOnInsert: {
          name: 'Anonymous Visitor',
          firstVisitAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        lean: true,
      },
    )

    return visitor
  } catch (error) {
    console.error('[KeilaChat Backend Error] createOrUpdateVisitor failed:', error)
    return null
  }
}

// 2. Pass the parameters down from your primary orchestration handler:
export async function initializeWidgetSession(
  widgetId: string,
  visitorTrackingId?: string,
  origin?: string,
  clientMetadata?: any, // 🎯 Receive payload context from controller
  reqIp?: string
): Promise<WidgetInitializationResult> {
  const property = await getPropertyByWidgetId(widgetId)
  const account = await validateAccount(property.accountId.toString())
  await validateProperty(property)
  await validateWidgetDomain(property, origin) 

  const [onlineOperators, visitor] = await Promise.all([
    getOnlineOperatorCount(property.accountId.toString()),
    // Forward variables down to creation layers safely
    createOrUpdateVisitor(property._id.toString(), visitorTrackingId, clientMetadata, reqIp),
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
  const widgetSettings = {
    launcherPosition:
      property.widgetSettings?.launcherPosition ?? 'bottom-right',

    launcherIcon: property.widgetSettings?.launcherIcon ?? '',

    welcomeMessage:
      property.widgetSettings?.welcomeMessage ?? 'Hi 👋 How can we help?',

    offlineMessage:
      property.widgetSettings?.offlineMessage ?? 'Leave us a message.',

    showAgentPhoto: property.widgetSettings?.showAgentPhoto ?? true,

    soundEnabled: property.widgetSettings?.soundEnabled ?? true,

    allowFileUpload: property.widgetSettings?.allowFileUpload ?? true,

    allowEmoji: property.widgetSettings?.allowEmoji ?? true,

    allowScreenshots: property.widgetSettings?.allowScreenshots ?? false,

    allowVoiceRecordings: property.widgetSettings?.allowVoiceRecordings ?? true,
  }

  const isOnline = onlineOperators > 0 && property.settings?.onlineStatus

  return {
    status: 'success',

    message: 'Widget initialized successfully.',

    data: {
      widget: {
        id: property.widgetId,

        version: '1.0.0',

        initialized: true,

        launcherPosition: widgetSettings.launcherPosition,

        launcherIcon: widgetSettings.launcherIcon,
      },

      property: {
        id: property._id,

        name: property.name,

        logo: property.details?.logoUrl ?? '',

        category: property.details?.category,
      },

      chat: {
        online: isOnline,

        operators: onlineOperators,

        welcomeMessage: isOnline
          ? widgetSettings.welcomeMessage
          : widgetSettings.offlineMessage,

        allowFileUpload: widgetSettings.allowFileUpload,

        allowEmoji: widgetSettings.allowEmoji,

        allowScreenshots: widgetSettings.allowScreenshots,

        soundEnabled: widgetSettings.soundEnabled,

        showAgentPhoto: widgetSettings.showAgentPhoto,

        aiEnabled: property.settings?.aiEnabled ?? true,

        allowVoiceRecordings: widgetSettings.allowVoiceRecordings,
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