import { useState, useCallback } from 'react';
import { R2Storage } from '@/lib/r2-storage';
import { ImageHelpers } from '@/utils/imageHelpers';

type Uploaded = { url: string; object_key?: string };

export function useImageUpload(productId?: string) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadFromUrl = useCallback(async (url: string): Promise<Uploaded> => {
    const u = String(url || '').trim();
    if (!u) return { url: '', object_key: undefined };
    setUploading(true);
    try {
      if (productId) {
        const res = await R2Storage.uploadProductImageFromUrl(productId, u);
        return { url: res.originalUrl, object_key: res.r2KeyOriginal };
      }
      const key = ImageHelpers.extractObjectKeyFromUrl(u);
      return { url: u, object_key: key || undefined };
    } finally {
      setUploading(false);
    }
  }, [productId]);

  const uploadFile = useCallback(async (file: File): Promise<Uploaded> => {
    setUploading(true);
    try {
      if (productId) {
        const res = await R2Storage.uploadProductImage(productId, file);
        return { url: res.originalUrl, object_key: res.r2KeyOriginal };
      }
      const tmp = await R2Storage.uploadFile(file);
      return { url: tmp.publicUrl, object_key: tmp.objectKey };
    } finally {
      setUploading(false);
    }
  }, [productId]);

  return {
    isDragOver,
    setIsDragOver,
    uploading,
    uploadFromUrl,
    uploadFile,
  };
}
