// /src/services/readReceipt.service.ts

import Message from '../models/Message.js'

export class ReadReceiptService {
  static async markDelivered(messageId: string) {
    await Message.findByIdAndUpdate(messageId, {
      status: 'delivered',
    })
  }

  static async markSeen(messageId: string) {
    await Message.findByIdAndUpdate(messageId, {
      status: 'seen',
    })
  }
}