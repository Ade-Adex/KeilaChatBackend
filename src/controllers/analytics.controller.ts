// /src/controllers/analytics.controller.ts

import type { Request, Response } from 'express'
import { catchAsync } from '../config/errorHandler.js'
import ChatSession from '../models/ChatSession.js'
import Property from '../models/Property.js'
import mongoose from 'mongoose'

export const getDashboardAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.query
    if (!propertyId) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Property ID is required' })
    }

    const propObjectId = new mongoose.Types.ObjectId(propertyId as string)

    // 1. Calculate Aggregate Metrics (Wait Time, Durations, Message Densities)
    const metricsAggregation = await ChatSession.aggregate([
      { $match: { propertyId: propObjectId } },
      {
        $group: {
          _id: null,
          totalChats: { $sum: 1 },
          avgWaitTimeMs: { $avg: '$waitTimeMs' },
          avgDurationSec: { $avg: '$analytics.duration' },
          totalAIChats: {
            $sum: { $cond: [{ $eq: ['$aiHandled', true] }, 1, 0] },
          },
          aiResolvedChats: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$aiHandled', true] },
                    { $eq: ['$status', 'closed'] },
                    { $eq: ['$aiEscalated', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          escalatedChats: {
            $sum: { $cond: [{ $eq: ['$aiEscalated', true] }, 1, 0] },
          },
        },
      },
    ])

    const metrics = metricsAggregation[0] || {
      totalChats: 0,
      avgWaitTimeMs: 0,
      avgDurationSec: 0,
      totalAIChats: 0,
      aiResolvedChats: 0,
      escalatedChats: 0,
    }

    // 2. Generate Real Weekly Trend Chart Data (Groups by day of week)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const chartAggregation = await ChatSession.aggregate([
      {
        $match: { propertyId: propObjectId, createdAt: { $gte: sevenDaysAgo } },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' }, // Returns 1 (Sun) to 7 (Sat)
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const chartData = dayMap.map((label, index) => {
      const found = chartAggregation.find((item) => item._id === index + 1)
      return {
        label,
        conversations: found ? found.count : 0,
      }
    })

    res.status(200).json({
      status: 'success',
      data: {
        metrics: {
          avgResponseTimeSec: Math.round((metrics.avgWaitTimeMs || 0) / 1000),
          avgDurationSec: Math.round(metrics.avgDurationSec || 0),
        },
        aiInsights: {
          totalAIChats: metrics.totalAIChats,
          aiResolvedChats: metrics.aiResolvedChats,
          escalatedChats: metrics.escalatedChats,
        },
        chartData,
      },
    })
  },
)