//  /src/routes/v1/media.routes.ts

import { Router } from 'express'
import multer from 'multer'
import { uploadMedia } from '../../controllers/media.controller.js'

const router = Router()

// Configure temporary in-memory buffering for uploaded items
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB file ceiling limit
  },
})

/* -------------------------------------------------- */
/* POST /api/v1/media/upload                          */
/* -------------------------------------------------- */
router.post('/upload', upload.single('file'), uploadMedia)

export default router