// /src/types/socket.types.ts

export interface JoinChatPayload {
  sessionId: string

  propertyId?: string

  visitorId?: string

  operatorId?: string

  clientType: 'visitor' | 'operator'
}

export interface TypingPayload {
  sessionId: string
  senderName: string
  isTyping: boolean
}

export interface SendMessagePayload {
  sessionId: string
  propertyId: string

  senderType: 'visitor' | 'operator' | 'ai' | 'system'

  senderId: string

  messageText: string

  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file'

  isFromAI?: boolean

  media?: string[]
}

export interface JoinDashboardPayload {
  propertyId: string
  operatorId?: string
}

export interface NotificationPayload {
  propertyId: string
}