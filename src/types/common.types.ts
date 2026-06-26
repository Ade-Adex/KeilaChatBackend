// /src/types/common.types.ts

import type { Types } from 'mongoose'

export interface BaseEntity {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export type Status = 'active' | 'inactive' | 'suspended'