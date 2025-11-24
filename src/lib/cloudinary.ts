import { DEFAULT_MAX_IMAGE_BYTES, SAFE_IMAGE_MIME_TYPES, validateImageFile } from './validation'

const CLOUD_NAME = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || ''
const UPLOAD_PRESET = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || ''
const DEFAULT_FOLDER = (import.meta as any).env?.VITE_CLOUDINARY_FOLDER || 'trucycle/items'

export type CloudinaryUploadResult = {
  secureUrl: string
  publicId?: string
  width?: number
  height?: number
}

export async function uploadImageToCloudinary(file: File | Blob | string, options?: { folder?: string; alt?: string }): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env')
  }

  const isFileObject =
    (typeof File !== 'undefined' && file instanceof File) ||
    (typeof Blob !== 'undefined' && file instanceof Blob)
  if (isFileObject) {
    const validation = validateImageFile(file as File | Blob, {
      maxSizeBytes: DEFAULT_MAX_IMAGE_BYTES,
      allowedMimeTypes: SAFE_IMAGE_MIME_TYPES,
    })
    if (!validation.ok) {
      throw new Error(validation.reason || 'Invalid image selected for upload')
    }
  }

  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD_NAME)}/upload`
  const form = new FormData()
  form.append('file', file as any)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('folder', options?.folder || DEFAULT_FOLDER)
  if (options?.alt) form.append('context', `alt=${options.alt}`)

  const res = await fetch(url, { method: 'POST', body: form })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Cloudinary upload failed (${res.status}): ${txt || res.statusText}`)
  }
  const json = await res.json()
  return {
    secureUrl: json.secure_url as string,
    publicId: json.public_id as string | undefined,
    width: json.width as number | undefined,
    height: json.height as number | undefined,
  }
}
