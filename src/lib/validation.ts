const STRIP_TAGS_REGEX = /<\/?[^>]+>/g
const CONTROL_CHARS_REGEX = /[\u0000-\u0009\u000B-\u000C\u000E-\u001F\u007F]/g

export const SAFE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB per image by default

type SanitizeOptions = {
  maxLength?: number
  allowNewlines?: boolean
}

export function sanitizeText(input: string, options: SanitizeOptions = {}): string {
  const maxLength = Math.max(1, options.maxLength ?? 500)
  const allowNewlines = options.allowNewlines ?? false
  let value = (input ?? '').replace(STRIP_TAGS_REGEX, ' ')
  value = value.replace(CONTROL_CHARS_REGEX, ' ')

  if (allowNewlines) {
    value = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
  } else {
    value = value.replace(/\s+/g, ' ')
  }

  value = value.trim()
  if (value.length > maxLength) {
    value = value.slice(0, maxLength)
  }
  return value
}

export function sanitizeMultilineText(input: string, options: Omit<SanitizeOptions, 'allowNewlines'> = {}): string {
  return sanitizeText(input, { ...options, allowNewlines: true })
}

export function sanitizeEmail(input: string): string {
  return sanitizeText(input, { maxLength: 120 }).toLowerCase()
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  const pwd = password || ''
  const checks: Array<{ ok: boolean; message: string }> = [
    { ok: pwd.length >= 10, message: 'Password must be at least 10 characters long' },
    { ok: /[A-Z]/.test(pwd), message: 'Include at least one uppercase letter' },
    { ok: /[a-z]/.test(pwd), message: 'Include at least one lowercase letter' },
    { ok: /\d/.test(pwd), message: 'Include at least one number' },
    { ok: /[^A-Za-z0-9]/.test(pwd), message: 'Include at least one symbol' },
  ]

  const failing = checks.find((c) => !c.ok)
  if (failing) {
    return { valid: false, message: failing.message }
  }
  return { valid: true }
}

export function validateImageFile(
  file: { type?: string; size?: number; name?: string },
  options: { maxSizeBytes?: number; allowedMimeTypes?: string[] } = {}
): { ok: boolean; reason?: string } {
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_IMAGE_BYTES
  const allowedMimeTypes = options.allowedMimeTypes ?? SAFE_IMAGE_MIME_TYPES

  const mime = (file?.type || '').toLowerCase()
  if (mime && !allowedMimeTypes.some((t) => mime === t || (t.endsWith('/*') && mime.startsWith(t.replace('/*', '/'))))) {
    return { ok: false, reason: 'Unsupported file type. Use JPEG, PNG, WEBP, or HEIC images.' }
  }

  const size = Number(file?.size ?? 0)
  if (Number.isFinite(size) && size > maxSizeBytes) {
    const mb = (maxSizeBytes / (1024 * 1024)).toFixed(1)
    return { ok: false, reason: `File is too large. Max ${mb}MB allowed.` }
  }

  return { ok: true }
}
