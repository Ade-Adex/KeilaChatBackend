//  /src/utils/visitor/identity.ts

import { v4 as uuidv4 } from 'uuid'

/**
 * Generates a standard tracking ID string with a prefix.
 */
export const generateVisitorTrackingId = (): string => {
  return `v_${uuidv4()}`
}