// /src/routes/property.routes.ts

import { Router } from 'express'
import { getPropertyDetails } from '../controllers/property.controller.js'

const router = Router()

router.get('/:propertyId', getPropertyDetails)

export default router