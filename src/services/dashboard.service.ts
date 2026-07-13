// /src/services/dashboard.service.ts

import ChatSession from '../models/ChatSession.js'
import Operator from '../models/Operator.js'
import Visitor from '../models/Visitor.js'
import Notification from '../models/Notification.js'
import Message from '../models/Message.js'
import Property from '../models/Property.js'
import { AppError } from './appError.js'
import mongoose from 'mongoose'

export class DashboardService {
  /**
   * Resolves website property workspace attributes for the active dashboard session
   */
  static async getDashboardContext(propertyId: string, accountId: string) {
    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new AppError(
        'A valid property context ID parameter is required.',
        400,
      )
    }

    // Load data context without exposing the highly sensitive programmatic write api keys
    const property = await Property.findOne({
      _id: propertyId,
      accountId,
    })
      .select('-apiKey')
      .lean()

    if (!property) {
      throw new AppError(
        'The active workspace tracking configuration was not found.',
        404,
      )
    }

    return {
      property,
    }
  }

  /*
   ********************************
   * DASHBOARD OVERVIEW
   ********************************
   */
  static async getOverview(propertyId: string) {
    const [
      activeChats,
      queuedChats,
      waitingChats,
      totalVisitors,
      onlineVisitors,
      onlineOperators,
      unreadNotifications,
    ] = await Promise.all([
      ChatSession.countDocuments({
        propertyId,
        status: 'active',
      }),

      ChatSession.countDocuments({
        propertyId,
        status: 'queued',
      }),

      ChatSession.countDocuments({
        propertyId,
        status: 'waiting',
      }),

      Visitor.countDocuments({
        propertyId,
      }),

      Visitor.countDocuments({
        propertyId,
        isOnline: true,
      }),

      Operator.countDocuments({
        assignedProperties: propertyId,
        isOnline: true,
      }),

      Notification.countDocuments({
        propertyId,
        status: 'unread',
      }),
    ])

    // Generate last 7 days time-series placeholder array for the chart UI context
    const chartData = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      return {
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        chats: 0,
        visitors: index === 6 ? totalVisitors : 0,
      }
    })

    return {
      activeChats,
      queuedChats,
      waitingChats,
      totalVisitors,
      onlineVisitors,
      onlineOperators,
      unreadNotifications,
      chartData, 
    }
  }

  /*
   ********************************
   * ACTIVE CHATS
   ********************************
   */
  static async getActiveChats(propertyId: string) {
    return ChatSession.find({
      propertyId,
      status: 'active',
    })
      .populate('visitorId')
      .populate('assignedOperatorId')
      .sort({
        updatedAt: -1,
      })
      .lean()
  }

  /*
   ********************************
   * CHAT QUEUE
   ********************************
   */
  static async getQueue(propertyId: string) {
    return ChatSession.find({
      propertyId,
      status: 'queued',
    })
      .populate('visitorId')
      .sort({
        createdAt: 1,
      })
      .lean()
  }

  /*
   ********************************
   * ONLINE OPERATORS
   ********************************
   */
  static async getOnlineOperators(accountId: string) {
    return Operator.find({
      accountId,
      isOnline: true,
    })
      .sort({
        activeChatsCount: 1,
      })
      .lean()
  }

  /*
   ********************************
   * LIVE VISITORS
   ********************************
   */
  static async getOnlineVisitors(propertyId: string) {
    return Visitor.find({
      propertyId,
      isOnline: true,
    })
      .sort({
        lastSeen: -1,
      })
      .lean()
  }

  /*
   ********************************
   * RECENT MESSAGES
   ********************************
   */
  static async getRecentMessages(propertyId: string) {
    const sessions = await ChatSession.find({
      propertyId,
    }).select('_id')

    return Message.find({
      sessionId: {
        $in: sessions.map((s) => s._id),
      },
    })
      .sort({
        createdAt: -1,
      })
      .limit(50)
      .lean()
  }

  /*
   ********************************
   * NOTIFICATIONS
   ********************************
   */
  static async getNotifications(propertyId: string) {
    return Notification.find({
      propertyId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(50)
      .lean()
  }

  /*
   ********************************
   * CHAT ANALYTICS
   ********************************
   */
  static async getAnalytics(propertyId: string) {
    const sessions = await ChatSession.find({
      propertyId,
      status: 'closed',
    })

    const totalChats = sessions.length

    const averageDuration =
      totalChats === 0
        ? 0
        : sessions.reduce(
            (sum, session) => sum + (session.analytics?.duration ?? 0),
            0,
          ) / totalChats

    const averageReplyTime =
      totalChats === 0
        ? 0
        : sessions.reduce(
            (sum, session) => sum + (session.analytics?.averageReplyTime ?? 0),
            0,
          ) / totalChats

    return {
      totalChats,
      averageDuration,
      averageReplyTime,
    }
  }

  /*
   ********************************
   * OPERATOR WORKLOAD
   ********************************
   */
  static async getOperatorLoad(accountId: string) {
    return Operator.find({
      accountId,
    })
      .select(
        'firstName lastName activeChatsCount maxConcurrentChats availabilityStatus',
      )
      .sort({
        activeChatsCount: 1,
      })
      .lean()
  }
}