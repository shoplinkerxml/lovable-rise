import { R2Storage } from "@/lib/r2-storage";

const IMAGE_CACHE_MAX_SIZE = 300;
const imageCache = new Map<string, string>();

function cacheGet(key: string): string | undefined {
  const value = imageCache.get(key);
  if (value === undefined) return undefined;
  imageCache.delete(key);
  imageCache.set(key, value);
  return value;
}

function cacheSet(key: string, value: string): void {
  imageCache.delete(key);
  imageCache.set(key, value);
  while (imageCache.size > IMAGE_CACHE_MAX_SIZE) {
    const oldestKey = imageCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    imageCache.delete(oldestKey);
  }
}

type QueueItem = {
  key: string;
  resolve: (url: string) => void;
  reject: (error: Error) => void;
};

const requestQueue: QueueItem[] = [];
let isProcessing = false;
const BATCH_SIZE = 10;
const BATCH_DELAY = 50;

async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;

  try {
    while (requestQueue.length > 0) {
      const batch = requestQueue.splice(0, BATCH_SIZE);

      await Promise.all(
        batch.map(async ({ key, resolve, reject }) => {
          try {
            const url = await R2Storage.getViewUrl(key, 900);
            if (url) {
              cacheSet(key, url);
              resolve(url);
            } else {
              reject(new Error("No URL returned"));
            }
          } catch (error) {
            reject(error as Error);
          }
        })
      );

      if (requestQueue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }
  } finally {
    isProcessing = false;
  }
}

export async function loadImageUrl(key: string): Promise<string> {
  const cached = cacheGet(key);
  if (cached) return cached;

  return new Promise((resolve, reject) => {
    requestQueue.push({ key, resolve, reject });
    void processQueue();
  });
}

export function clearImageCache() {
  imageCache.clear();
}
