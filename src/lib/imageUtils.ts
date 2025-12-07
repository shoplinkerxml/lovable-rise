// Worker URL for image resizing
const WORKER_URL = 'https://image-resize-worker.shoplinkerxml.workers.dev'

export function getImageUrl(originalUrl: string | null | undefined, width?: number): string {
  if (!originalUrl || originalUrl === '' || originalUrl === '#processing' || originalUrl === '#failed') {
    return ''
  }
  
  // If no width specified, return original URL
  if (!width) return originalUrl
  
  // Use Cloudflare Worker for resizing
  const w = Math.max(1, Math.floor(Number(width)))
  return `${WORKER_URL}?src=${encodeURIComponent(originalUrl)}&w=${w}`
}

export const IMAGE_SIZES = {
  THUMB: 200,
  CARD: 600,
  LARGE: 1200,
} as const
