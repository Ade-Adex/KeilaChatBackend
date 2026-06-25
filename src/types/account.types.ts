// /src/types/account.types.ts

import type { BaseEntity } from './common.types.js'


export type AccountPlan = 'free' | 'starter' | 'pro' | 'enterprise'

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
}