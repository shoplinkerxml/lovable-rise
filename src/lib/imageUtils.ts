import { R2Storage } from '@/lib/r2-storage'

export function getImageUrl(originalUrl: string | null | undefined, _width?: number): string {
  const raw = originalUrl || ''
  if (raw === '' || raw === '#processing' || raw === '#failed') return ''
  const isAbsolute = /^https?:\/\//i.test(raw)
  const resolved = isAbsolute ? raw : R2Storage.makePublicUrl(raw)
  return resolved
}

export const IMAGE_SIZES = {
  THUMB: 200,
  CARD: 600,
  LARGE: 1200,
} as const

export function isVideoUrl(u: string | null | undefined): boolean {
  const s = String(u || '')
  return /\.(mp4|webm|mov|mkv)(\?|#|$)/i.test(s)
}
