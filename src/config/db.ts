// /src/config/db.ts

import mongoose from 'mongoose'
import dns from 'node:dns'

dns.setServers(['8.8.8.8', '8.8.4.4'])

export default async function connectDB() {
  const uri = process.env.MONGO_URI

  if (!uri) throw new Error('MONGO_URI missing')

  await mongoose.connect(uri)
}