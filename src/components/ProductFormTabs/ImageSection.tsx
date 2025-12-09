import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Image as ImageIcon, Check, X, Link as LinkIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/providers/i18n-provider'
import { getImageUrl, IMAGE_SIZES, isVideoUrl } from '@/lib/imageUtils'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel'

export type ProductImage = {
  id?: string
  url: string
  alt_text?: string
  order_index: number
  is_main: boolean
  object_key?: string
}

type Props = {
  images: ProductImage[]
  readOnly?: boolean
  isDragOver: boolean
  uploading?: boolean
  imageUrl: string
  onSetImageUrl: (v: string) => void
  onAddImageFromUrl: () => void
  onRemoveImage: (index: number) => void
  onSetMainImage: (index: number) => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDropZoneClick: () => void
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  getGalleryAdaptiveImageStyle: (index: number) => React.CSSProperties
  getMainAdaptiveImageStyle: () => React.CSSProperties
  galleryImgRefs: React.MutableRefObject<Array<HTMLImageElement | null>>
  onGalleryImageLoad: (e: React.SyntheticEvent<HTMLImageElement>, index: number) => void
  onGalleryImageError: (e: React.SyntheticEvent<HTMLImageElement>, index: number) => void
  onGalleryVideoLoaded: (e: React.SyntheticEvent<HTMLVideoElement>, index: number) => void
  activeIndex: number
  onSelectIndex: (index: number) => void
  onMainImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void
  onMainImageError: (e: React.SyntheticEvent<HTMLImageElement>) => void
  onMainVideoLoaded: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  onPrev: () => void
  onNext: () => void
}

export function ImageSection(props: Props) {
  const { t } = useI18n()
  const [isLarge, setIsLarge] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = (e: any) => setIsLarge(e.matches ?? mq.matches)
    h(mq)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  React.useEffect(() => {
    const el = props.galleryImgRefs.current[props.activeIndex];
    if (el && typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch {}
    }
  }, [props.activeIndex]);
  const getThumbFlexBasis = (count: number): string => {
    if (count <= 4) return '25%'
    if (count === 5) return '20%'
    if (count === 6) return '16.6667%'
    if (count === 7) return '14.2857%'
    return '12.5%'
  }
  return (
    <div className="relative space-y-3 md:space-y-4">
      <div className="mx-auto w-full max-w-[31.25rem] space-y-3 md:space-y-4">
      {props.images.length > 0 && (
        <div className="relative flex justify-center w-full">
          <Card className="relative group border border-border">
            <CardContent className="p-2 sm:p-3 md:p-4">
              <div
                className="relative overflow-hidden rounded-md flex items-center justify-center aspect-square cursor-pointer"
                style={props.getMainAdaptiveImageStyle()}
              >
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
                        props.onMainImageError(e)
                      }}
                    />
                  )
                })()}
              </div>
              {!props.readOnly && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  {props.images[props.activeIndex]?.is_main ? null : (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => props.onSetMainImage(props.activeIndex)}
                      aria-label={t('set_as_main_photo')}
                      className="rounded-md bg-success text-primary-foreground hover:bg-success/90"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="destructive" onClick={() => props.onRemoveImage(props.activeIndex)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
            {props.images.length > 1 && (
              <>
                <Button variant="outline" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 shadow-md rounded-full" onClick={props.onPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 shadow-md rounded-full" onClick={props.onNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </Card>
        </div>
      )}
      {props.images.length > 0 && (
          <div className="relative w-full">
            <Carousel className="w-full" opts={{ align: 'start', dragFree: true }}>
              <CarouselContent className="-ml-2">
                {props.images.map((image, index) => (
                  <CarouselItem key={index} className="pl-2" style={{ flex: `0 0 ${isLarge ? 5 : 4}rem` }}>
                  <Card
                    className={`relative group cursor-pointer transition-all ${props.activeIndex === index ? 'border border-emerald-500' : 'border border-border'}`}
                    onClick={() => props.onSelectIndex(index)}
                    data-testid={`productFormTabs_imageCard_${index}`}
                  >
                    <CardContent className="p-2">
                      <div className={`aspect-square relative overflow-hidden rounded-md bg-white`}>
                        {(() => {
                          const original = image.url
                          const isVid = isVideoUrl(original)
                          const src = isVid ? getImageUrl(original) : getImageUrl(original, IMAGE_SIZES.THUMB)
                          if (!src) return null
                          if (isVid) {
                            return (
                              <video src={src} className="w-full h-full object-cover" preload="metadata" onLoadedMetadata={(e) => props.onGalleryVideoLoaded(e, index)} />
                            )
                          }
                          return (
                            <img ref={(el) => (props.galleryImgRefs.current[index] = el)} src={src} alt={image.alt_text || `Изображение ${index + 1}`} className="w-full h-full object-cover" onLoad={(e) => props.onGalleryImageLoad(e, index)} onError={(e) => props.onGalleryImageError(e, index)} />
                          )
                        })()}
                      </div>
                      {null}
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      )}
      </div>

      

      {props.readOnly ? null : (
        <Card className="relative group w-full" data-testid="productFormTabs_dropZone">
          <CardContent className="p-1 md:p-2">
            <div
              className={`relative overflow-hidden rounded-md flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${props.isDragOver ? 'bg-emerald-100 border-2 border-dashed border-emerald-300 shadow-sm' : 'bg-emerald-50 hover:bg-emerald-100 border-2 border-dashed border-emerald-200 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100'} hover:scale-[1.01]`}
              style={{ width: '100%', maxWidth: '100%', height: 'auto', minHeight: 'clamp(12rem, 30vh, 24rem)' }}
              onDragEnter={props.onDragEnter}
              onDragOver={props.onDragOver}
              onDragLeave={props.onDragLeave}
              onDrop={props.onDrop}
              onClick={props.onDropZoneClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  props.onDropZoneClick()
                }
              }}
            >
              <ImageIcon className={`h-12 w-12 mb-2 md:mb-3 transition-colors ${props.isDragOver ? 'text-emerald-600' : 'text-emerald-500'}`} />
              <p className={`text-sm text-center px-2 transition-colors ${props.isDragOver ? 'text-emerald-700 font-medium' : 'text-emerald-700'}`}>{props.isDragOver ? t('drop_image_here') : t('click_to_upload') || t('add_images_instruction')}</p>
              <p className="text-xs text-center text-muted-foreground mt-1 md:mt-2 px-3" data-testid="productFormTabs_fileInfo">
                {t('image_types_and_limit')}
              </p>
              {props.uploading ? (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                    <span className="text-sm text-emerald-700">{t('uploading_image')}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {props.readOnly ? null : (
        <input type="file" accept="image/*,.avif,image/avif" onChange={props.onFileUpload} className="hidden" id="fileUpload" data-testid="productFormTabs_fileInput" />
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
        <div className="flex-1">
          {props.readOnly ? null : (
            <>
              <Label htmlFor="imageUrl">{t('add_image_by_url')}</Label>
              <div className="flex gap-2 mt-2">
                <Input id="imageUrl" name="imageUrl" autoComplete="url" value={props.imageUrl} onChange={(e) => props.onSetImageUrl(e.target.value)} placeholder={t('image_url_placeholder')} data-testid="productFormTabs_imageUrlInput" />
                <Button onClick={props.onAddImageFromUrl} variant="outline" size="icon" data-testid="productFormTabs_addImageUrlButton">
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImageSection
