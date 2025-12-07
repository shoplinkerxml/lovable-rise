import { R2Storage } from '@/lib/r2-storage'

export function getImageUrl(originalUrl: string | null | undefined, width?: number): string {
  if (!originalUrl || originalUrl === '' || originalUrl === '#processing' || originalUrl === '#failed') {
    return ''
  }
  const workerBase = R2Storage.getImageBaseUrl() || R2Storage.getWorkerUrl()
  const isHttp = typeof originalUrl === 'string' && /^https?:\/\//i.test(originalUrl)
  const fullSrc = isHttp ? String(originalUrl) : R2Storage.makePublicUrl(String(originalUrl))
  if (!width) return fullSrc
  if (!workerBase) return fullSrc
  const w = Math.max(1, Math.floor(Number(width)))
  return `${workerBase}?src=${encodeURIComponent(fullSrc)}&w=${w}`
}

export const IMAGE_SIZES = {
  THUMB: 200,
  CARD: 600,
  LARGE: 1200,
} as const
