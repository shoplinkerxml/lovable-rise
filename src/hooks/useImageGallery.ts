import { useEffect, useMemo, useState, useCallback } from 'react';

export function useImageGallery(imagesLength: number, activeTab: string, onImagesLoadingChange?: (flag: boolean) => void) {
  const [galleryLoaded, setGalleryLoaded] = useState(imagesLength === 0);
  const [galleryLoadCount, setGalleryLoadCount] = useState(0);

  const notify = useCallback((flag: boolean) => {
    if (!onImagesLoadingChange) return;
    setTimeout(() => onImagesLoadingChange(flag), 0);
  }, [onImagesLoadingChange]);

  useEffect(() => {
    setGalleryLoadCount(0);
    setGalleryLoaded(imagesLength === 0);
    if (activeTab === 'images') {
      notify(imagesLength > 0 && !galleryLoaded);
    } else {
      notify(false);
    }
  }, [imagesLength, activeTab, galleryLoaded, notify]);

  const incrementLoadCount = useCallback(() => {
    setGalleryLoadCount(prev => {
      const next = prev + 1;
      if (next >= imagesLength) {
        setGalleryLoaded(true);
        notify(false);
      }
      return next;
    });
  }, [imagesLength, notify]);

  const resetLoadCount = useCallback(() => {
    setGalleryLoadCount(0);
    setGalleryLoaded(imagesLength === 0);
  }, [imagesLength]);

  const isLoading = useMemo(() => imagesLength > 0 && !galleryLoaded, [imagesLength, galleryLoaded]);

  return { galleryLoaded, incrementLoadCount, resetLoadCount, isLoading };
}

