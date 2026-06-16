// /src/config/db.ts

import mongoose from 'mongoose'
import dns from "node:dns"; 

dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async (): Promise<void> => {
  try {
    const connString = process.env.MONGO_URI
    if (!connString) {
      throw new Error('MONGO_URI is missing from environment variables.')
    }

    await mongoose.connect(connString)
    // Green colored success indicator text
    console.log(
      '\x1b[32m%s\x1b[0m',
      '🟩 [DATABASE] MongoDB Connected Successfully',
    )
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(
        '\x1b[31m%s\x1b[0m',
        `🟥 [DATABASE] MongoDB Connection Error: ${error.message}`,
      )
    } else {
      console.error(
        '\x1b[31m%s\x1b[0m',
        '🟥 [DATABASE] MongoDB Connection Error: An unexpected error occurred',
        error,
      )
    }
    process.exit(1)
  }
}

export default connectDB