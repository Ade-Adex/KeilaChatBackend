// /src/types/common.types.ts

export type ID = string

export interface BaseEntity {
  _id: ID
  createdAt: Date
  updatedAt: Date
}

export type Status = 'active' | 'inactive' | 'suspended'