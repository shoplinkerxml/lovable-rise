import { R2Storage } from '@/lib/r2-storage'

export function getImageUrl(originalUrl: string | null | undefined, width?: number): string {
  const raw = originalUrl || ''
  if (raw === '' || raw === '#processing' || raw === '#failed') return ''
  const isAbsolute = /^https?:\/\//i.test(raw)
  let resolved = isAbsolute ? raw : R2Storage.makePublicUrl(raw)
  // Если воркер не подключен, а URL указывает на превью (thumb/card), отдаём оригинал
  resolved = resolved.replace(/\/(thumb|card)\.webp(\?|#|$)/i, '/original.webp$2')
  const worker = R2Storage.getWorkerUrl()
  if (/supabase\.co\/functions\/v1\//i.test(resolved)) return resolved
  if (!worker || !width) return resolved
  const w = Math.max(1, Math.floor(Number(width)))
  const key = R2Storage.extractObjectKeyFromUrl(resolved) || resolved.replace(/^https?:\/\/[^/]+\/?/, '')
  return `${worker}/w${w}/${key}`
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
