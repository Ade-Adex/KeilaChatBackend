// /src/routes/v1/analytics.routes.ts

import { Router } from 'express'

const router = Router()

router.get('/overview', (req, res) => {
  res.json({ message: 'Analytics coming soon' })
})

export default router
