// /src/types/message.types.ts

import type { Types } from "mongoose"
import type { BaseEntity } from './common.types.js'


export type SenderType = 'visitor' | 'operator' | 'ai' | 'system'
export type MessageStatus = 'sent' | 'delivered' | 'seen' | 'failed'
export type MessageType = 'text' | 'image' | 'file' | 'system' | 'ai_suggestion'

export interface MessageAttachment {
  fileUrl: string
  fileType: string
  fileName: string
}

export interface AIMessageMetadata {
  model?: string
  confidence?: number
  intent?: string
}

export interface IMessage extends BaseEntity {
  sessionId: Types.ObjectId

  senderType: SenderType
  senderId: string

  messageText: string

  messageType: MessageType

  status: MessageStatus

  isFromAI: boolean

  aiMetadata?: AIMessageMetadata

  attachments: MessageAttachment[]

  readBy: {
    operatorId?: string
    readAt: Date
  }[]

  editedAt?: Date
}