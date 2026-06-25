// /src/utils/property/credentials.ts

import { v4 as uuidv4 } from 'uuid'
import { generateApiKey } from '../auth/crypto.js'

export const generatePropertyCredentials = () => {
  return {
    widgetId: uuidv4(),
    apiKey: generateApiKey(),
  }
}