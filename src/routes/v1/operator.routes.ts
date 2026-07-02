// /src/routes/v1/operator.routes.ts

import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware.js'
import { tenantMiddleware } from '../../middleware/tenant.middleware.js'
import { rbac } from '../../middleware/rbac.middleware.js'

import {
  getOperators,
  inviteOperator,
  getProfile,
  updateProfile,
  verifyInvite,
  acceptInvite,
  getMySessions,
  updatePresence,
  availableOperators,
  getActiveOperatorsController,
} from '../../controllers/operator.controller.js'


const router = Router()

/* -------------------------------------------------------------------------- */
/*                              PUBLIC ROUTES                                 */
/* -------------------------------------------------------------------------- */

router.get('/invite/verify', verifyInvite)

router.post('/invite/accept', acceptInvite)

/* -------------------------------------------------------------------------- */
/*                             PROTECTED ROUTES                               */
/* -------------------------------------------------------------------------- */

router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/', rbac('admin', 'supervisor'), getOperators)

router.get('/active', getActiveOperatorsController)

router.post('/invite', rbac('admin'), inviteOperator)

router.get('/profile', getProfile)

router.put('/profile', updateProfile)

/*
|--------------------------------------------------------------------------
| Live Chat
|--------------------------------------------------------------------------
*/

router.get(
  '/my-sessions',
  getMySessions,
)

router.patch(
  '/presence',
  updatePresence,
)

router.get(
  '/available',
  availableOperators,
)

export default router
