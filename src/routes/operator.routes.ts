// /src/routes/operator.routes.ts
import { Router } from 'express'
import {
  getOperators,
  inviteOperator,
} from '../controllers/operator.controller.js'

const router = Router()

router.route('/').get(getOperators)
router.route('/invite').post(inviteOperator) 

export default router
