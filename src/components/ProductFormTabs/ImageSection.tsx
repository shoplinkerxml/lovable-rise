import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Image as ImageIcon, Check, X, Link as LinkIcon } from 'lucide-react'
import { useI18n } from '@/providers/i18n-provider'

export type ProductImage = {
  id?: string
  url: string
  alt_text?: string
  order_index: number
  is_main: boolean
  object_key?: string
  thumb_url?: string
}

type Props = {
  images: ProductImage[]
  readOnly?: boolean
  isDragOver: boolean
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
  galleryImgRefs: React.MutableRefObject<Array<HTMLImageElement | null>>
  onGalleryImageLoad: (e: React.SyntheticEvent<HTMLImageElement>, index: number) => void
  onGalleryImageError: (e: React.SyntheticEvent<HTMLImageElement>, index: number) => void
}

export function ImageSection(props: Props) {
  const { t } = useI18n()
  return (
    <div className="relative space-y-3 md:space-y-4">
      <div className="flex flex-wrap gap-3 md:gap-4">
        {props.images.map((image, index) => (
          <Card key={index} className="relative group" data-testid={`productFormTabs_imageCard_${index}`}>
            <CardContent className="p-2">
              <div className="relative overflow-hidden rounded-md flex items-center justify-center" style={props.getGalleryAdaptiveImageStyle(index)}>
                <img
                  ref={(el) => (props.galleryImgRefs.current[index] = el)}
                  src={image.url}
                  alt={image.alt_text || `Изображение ${index + 1}`}
                  className="w-full h-full object-contain"
                  onLoad={(e) => props.onGalleryImageLoad(e, index)}
                  onError={(e) => props.onGalleryImageError(e, index)}
                />
                {props.readOnly ? null : (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => props.onSetMainImage(index)}
                      aria-label={image.is_main ? t('main_photo') : t('set_as_main_photo')}
                      data-testid={`productFormTabs_setMainButton_${index}`}
                      className={`rounded-md ${image.is_main ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-success text-primary-foreground hover:bg-success/90'}`}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => props.onRemoveImage(index)} data-testid={`productFormTabs_removeImageButton_${index}`}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {image.is_main && (
                <Badge className="absolute top-2 left-2" variant="default">
                  {t('main_photo')}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

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
