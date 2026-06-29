// /src/types/account.types.ts

import type { BaseEntity } from './common.types.js'

export type AccountPlan = 'free' | 'starter' | 'pro' | 'enterprise'

export interface AccountBranding {
  companyLogo?: string
  companyWebsite?: string
  companyPhone?: string
}

export interface AccountSubscription {
  stripeCustomerId?: string
  subscriptionId?: string
  expiresAt?: Date
}

export interface AccountUsage {
  totalChats: number
  totalVisitors: number
  currentMonthMessages: number
  totalMessages: number
  totalOperators: number
  totalProperties: number
}

export interface AccountSettings {
  aiEnabled: boolean
  maxOperators: number
  maxVisitors: number
}

export interface IAccount extends BaseEntity {
  name: string
  plan: AccountPlan
  ownerEmail: string
  isActive: boolean

  settings: AccountSettings

  branding?: AccountBranding

  subscription?: AccountSubscription

  usage?: AccountUsage
}