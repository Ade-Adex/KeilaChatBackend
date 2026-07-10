// /src/bootstrap/cron.ts

import Operator from '../models/Operator.js'
import { EventService } from '../services/event.service.js'
import logger from './logger.js'

export const bootstrapCron = (): void => {
  // Run the check every 1 minute
  setInterval(async () => {
    try {
      // 🎯 Threshold: 5 minutes of total silence means you are disconnected
      const INACTIVITY_TIMEOUT = 5 * 60 * 1000
      const cutoffTime = new Date(Date.now() - INACTIVITY_TIMEOUT)

      // Find operators who are still flag-marked active in MongoDB but haven't pinged
      const inactiveOperators = await Operator.find({
        isOnline: true,
        availabilityStatus: { $ne: 'offline' },
        $or: [
          { lastSeen: { $lt: cutoffTime } },
          { lastSeen: { $exists: false } },
        ],
      }).select('_id accountId email')

      if (inactiveOperators.length > 0) {
        for (const operator of inactiveOperators) {
          const opIdStr = operator._id.toString()

          // 1️⃣ Reset persistent DB status so AI routing ignores them
          await Operator.updateOne(
            { _id: operator._id },
            {
              $set: {
                isOnline: false,
                availabilityStatus: 'offline',
                socketId: null,
              },
            },
          )

          // 2️⃣ Broadcast the presence shift out to the active live workspace layouts
          EventService.emitToProperty(
            operator.accountId.toString(),
            'operator_status_changed',
            {
              operatorId: opIdStr,
              availabilityStatus: 'offline',
              isOnline: false,
            },
          )

          logger.warn(
            `[Presence Sweeper] Operator ${operator.email} auto-logged offline due to missing heartbeat.`,
          )
        }
      }
    } catch (error) {
      logger.error(
        error,
        'Error executing background operator presence cleanup sweeper loop',
      )
    }
  }, 60 * 1000)

  console.log(
    '\x1b[32m%s\x1b[0m',
    '✅ Cron presence background sweeper bootstrap completed.',
  )
}
