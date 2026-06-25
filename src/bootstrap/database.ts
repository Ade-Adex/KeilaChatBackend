// /src/bootstrap/database.ts

import connectDB from '../config/db.js'
import logger from './logger.js'

export const bootstrapDatabase = async (): Promise<void> => {
  await connectDB()
  logger.info('🟢 Database bootstrap completed')
}