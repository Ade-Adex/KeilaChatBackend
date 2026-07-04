// /src/types/property.types.ts

import type { Types } from 'mongoose'
import type { BaseEntity } from './common.types.js'

export interface PropertyDetails {
  category: string
  subCategory: string
  region: string
  description: string
  logoUrl?: string
}

export interface PropertySettings {
  themeColor: string
  headingText: string
  onlineStatus: boolean
  trackIp: boolean
  autoAssign: boolean
  aiEnabled: boolean
  aiFallbackToHuman: boolean
  responseTimeGoalMs?: number
}

export interface WidgetSettings {
  aiName?: string | undefined

  launcherPosition: 'bottom-right' | 'bottom-left'

  launcherIcon?: string | undefined

  welcomeMessage: string

  offlineMessage: string

  showAgentPhoto: boolean

  soundEnabled: boolean

  allowFileUpload: boolean

  allowEmoji: boolean

  allowScreenshots: boolean
}

export interface InstallationInfo {
  installedAt?: Date

  lastVerified?: Date

  verified: boolean
}

export interface IProperty extends BaseEntity {
  accountId: Types.ObjectId

  name: string

  domain: string

  allowedDomains: string[]

  widgetId: string

  apiKey: string

  details: PropertyDetails

  settings: PropertySettings

  widgetSettings: WidgetSettings

  installation: InstallationInfo

  workingHours?: {
    enabled: boolean
    timezone: string
    schedule: Record<string, { open: string; close: string }>
  }
}