// /src/services/media.service.ts

import { v2 as cloudinary } from 'cloudinary'
import { AppError } from './appError.js'
import { ENV } from '../config/env.js'

// 🎯 FIX: Access the nested CLOUDINARY properties correctly
cloudinary.config({
  cloud_name: ENV.CLOUDINARY.CLOUD_NAME,
  api_key: ENV.CLOUDINARY.API_KEY,
  api_secret: ENV.CLOUDINARY.API_SECRET,
})

export class MediaService {
  /**
   * Streams a file buffer directly to Cloudinary and returns a secure CDN URL
   */
  static async uploadToCloud(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const base64File = `data:${mimeType};base64,${fileBuffer.toString('base64')}`

      cloudinary.uploader.upload(
        base64File,
        {
          resource_type: 'auto',
          folder: 'chat-attachments',
        },
        (error, result) => {
          if (error) {
            return reject(
              new AppError(
                error.message || 'Cloudinary upload stream failed.',
                500,
              ),
            )
          }
          if (!result) {
            return reject(
              new AppError(
                'No response payload received from storage provider.',
                500,
              ),
            )
          }

          resolve(result.secure_url)
        },
      )
    })
  }
}