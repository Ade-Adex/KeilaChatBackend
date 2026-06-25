//  /src/bootstrap/logger.ts

import pino from 'pino'
import { ENV } from '../config/env.js'

const isDev = ENV.NODE_ENV !== 'production'

const logger = pino({
  level: isDev ? 'debug' : 'info',

  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
})

export default logger