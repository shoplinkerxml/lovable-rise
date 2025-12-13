import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductPlaceholder } from '@/components/ProductPlaceholder'
import { getImageUrl, IMAGE_SIZES, isVideoUrl } from '@/lib/imageUtils'
import { R2Storage } from '@/lib/r2-storage'
import { ImageHelpers } from '@/utils/imageHelpers'
import type { ProductImage } from './types'

type Props = {
  images: ProductImage[]
  activeIndex: number
  onSelectIndex: (index: number) => void
  getMainAdaptiveImageStyle: () => React.CSSProperties
  isLargeScreen: boolean
  getThumbSizeRem: (large: boolean) => number
  galleryImgRefs: React.MutableRefObject<Array<HTMLImageElement | null>>
  onGalleryImageLoad: (e: React.SyntheticEvent<HTMLImageElement>, index: number) => void
  onGalleryImageError: (e: React.SyntheticEvent<HTMLImageElement>, index: number) => void
  onGalleryVideoLoaded: (e: React.SyntheticEvent<HTMLVideoElement>, index: number) => void
  onPrev: () => void
  onNext: () => void
  onMainImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void
  onMainImageError: (e: React.SyntheticEvent<HTMLImageElement>) => void
  onMainVideoLoaded: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  onMainVideoError?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  onResizeStart: (e: React.MouseEvent<HTMLButtonElement>) => void
  onResetSize: () => void
}

export default function ImagePreviewSection(props: Props) {
  return (
    <div className="mx-auto w-full space-y-3 md:space-y-4" style={{ maxWidth: `calc(${props.getMainAdaptiveImageStyle().width} + clamp(0.5rem, 2vw, 1rem))` }}>
      {props.images.length > 0 ? (
        <div className="space-y-4">
          <div className="relative flex justify-center">
            <Card className="relative group overflow-hidden border-0 shadow-none">
              <CardContent className="p-0">
                <div className="relative overflow-hidden rounded-md flex items-center justify-center aspect-square cursor-pointer max-w-full p-0" style={props.getMainAdaptiveImageStyle()}>
                  {(() => {
                    const original = props.images[props.activeIndex]?.url || ''
                    const isVid = isVideoUrl(original)
                    const src = isVid ? getImageUrl(original) : getImageUrl(original, IMAGE_SIZES.CARD)
                    if (!src) return null
                    if (isVid) {
                      return (
                        <video
                          src={src}
                          className="w-full h-full object-contain select-none"
                          controls
                          onLoadedMetadata={props.onMainVideoLoaded}
                          onError={props.onMainVideoError as any}
                        />
                      )
                    }
                    return (
                      <img
                        src={src}
                        alt={props.images[props.activeIndex]?.alt_text || `Фото ${props.activeIndex + 1}`}
                        className="w-full h-full object-contain select-none"
                        onLoad={props.onMainImageLoad}
                        onError={(e) => {
                          const el = e.target as HTMLImageElement
                          if (original) el.src = original
                          const key = original ? ImageHelpers.extractObjectKeyFromUrl(original) : null
                          if (key) {
                            R2Storage.getViewUrl(key).then((view) => { if (view) el.src = view }).catch(() => void 0)
                          }
                          props.onMainImageError(e)
                        }}
                      />
                    )
                  })()}
                </div>
              </CardContent>
              {props.images.length > 1 && (
                <>
                  <Button variant="outline" size="icon" className="absolute top-1/2 -translate-y-1/2 rounded-full bg-transparent border border-border text-foreground hover:border-emerald-500 hover:text-emerald-600 active:scale-95 active:shadow-inner transition-colors" style={{ left: 'min(1.75%, 0.5rem)' }} onClick={props.onPrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="absolute top-1/2 -translate-y-1/2 rounded-full bg-transparent border border-border text-foreground hover:border-emerald-500 hover:text-emerald-600 active:scale-95 active:shadow-inner transition-colors" style={{ right: 'min(1.75%, 0.5rem)' }} onClick={props.onNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <button type="button" aria-label="Resize photo block" className="absolute bottom-2 right-2 size-4 rounded-sm bg-primary/20 hover:bg-primary/30 cursor-nwse-resize hidden sm:block" onMouseDown={props.onResizeStart} onDoubleClick={props.onResetSize} />
            </Card>
          </div>
          <div className="relative w-full">
            <Carousel className="w-full" opts={{ align: 'start', dragFree: true }}>
              <CarouselContent className="-ml-2 mr-2">
                {props.images.map((image, index) => (
                  <CarouselItem key={index} className="pl-2" style={{ flex: `0 0 ${props.getThumbSizeRem(props.isLargeScreen)}rem` }}>
                    <Card className={`relative group cursor-pointer transition-all border-0 shadow-none`} onClick={() => props.onSelectIndex(index)}>
                      <CardContent className="p-2">
                        <div className={`aspect-square relative overflow-hidden rounded-md bg-white ${index === props.activeIndex ? 'border-2 border-emerald-500' : ''}`}>
                          {(() => {
                            const original = image.url || ''
                            const isVid = isVideoUrl(original)
                            const src = isVid ? getImageUrl(original) : getImageUrl(original)
                            if (!src) return null
                            if (isVid) {
                              return (
                                <video src={src} className="w-full h-full object-contain" preload="metadata" onLoadedMetadata={(e) => props.onGalleryVideoLoaded(e, index)} />
                              )
                            }
                            return (
                              <img ref={(el) => (props.galleryImgRefs.current[index] = el)} src={src} alt={image.alt_text || `Превью ${index + 1}`} className="w-full h-full object-contain" onLoad={(e) => props.onGalleryImageLoad(e, index)} onError={(e) => props.onGalleryImageError(e, index)} />
                            )
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      ) : (
        <div className="aspect-square flex items-center justify-center p-0 cursor-pointer" style={props.getMainAdaptiveImageStyle()} onDoubleClick={props.onResetSize}>
          <ProductPlaceholder className="w-full h-full" />
        </div>
      )}
    </div>
  )
}
