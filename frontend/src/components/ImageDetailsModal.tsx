import { Image as ImageType } from '@/types';
import { Heart, Download, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ImageDetailsModalProps {
  image: ImageType | null;
  isOpen: boolean;
  onClose: () => void;
  onFavoriteToggle?: (id: number) => void;
  onDelete?: (id: number) => void;
  isFavorite?: boolean;
  isLoading?: boolean;
}

export function ImageDetailsModal({
  image,
  isOpen,
  onClose,
  onFavoriteToggle,
  onDelete,
  isFavorite = false,
  isLoading = false,
}: ImageDetailsModalProps) {
  if (!image) return null;

  const largeUrl = image.full_url;
  const hasExif = Boolean(
    image.camera_model || image.lens_model || image.f_number || image.iso || image.focal_length || image.exposure_time
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 bg-neutral-950 border-neutral-800 max-h-[90vh] flex flex-col">
        <div className="flex-1 overflow-auto flex">
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            <img
              src={largeUrl}
              alt={image.filename}
              className="max-h-[70vh] max-w-full object-contain"
              loading="lazy"
            />
          </div>

          <div className="w-96 border-l border-neutral-800 p-6 flex flex-col gap-6 overflow-auto">
            <div>
              <h2 className="font-semibold text-white mb-2 text-sm truncate">
                {image.filename}
              </h2>
              <p className="text-xs text-neutral-500">
                {format(parseISO(image.upload_date), 'MMM d, yyyy · HH:mm')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2 h-9"
                onClick={() => onFavoriteToggle?.(image.id)}
                disabled={isLoading}
              >
                <Heart
                  className={cn(
                    'h-4 w-4',
                    isFavorite || image.is_favorite
                      ? 'fill-red-500 text-red-500'
                      : 'text-neutral-400'
                  )}
                />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2 h-9"
                asChild
              >
                <a href={largeUrl} download={image.filename}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2 h-9 text-red-500 hover:text-red-600"
                onClick={() => {
                  onDelete?.(image.id);
                  onClose();
                }}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {hasExif && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Details
                </h3>
                <div className="space-y-2 text-xs">
                  {image.camera_model && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Camera</span>
                      <span className="text-neutral-200">{image.camera_model}</span>
                    </div>
                  )}
                  {image.lens_model && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Lens</span>
                      <span className="text-neutral-200">{image.lens_model}</span>
                    </div>
                  )}
                  {image.f_number && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Aperture</span>
                      <span className="text-neutral-200">f/{image.f_number}</span>
                    </div>
                  )}
                  {image.iso && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">ISO</span>
                      <span className="text-neutral-200">{image.iso}</span>
                    </div>
                  )}
                  {image.focal_length && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Focal Length</span>
                      <span className="text-neutral-200">{image.focal_length}</span>
                    </div>
                  )}
                  {image.exposure_time && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Shutter</span>
                      <span className="text-neutral-200">{image.exposure_time}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {image.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {image.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="bg-neutral-800 text-neutral-300"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {image.albums.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Albums
                </h3>
                <div className="flex flex-wrap gap-2">
                  {image.albums.map((album, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-neutral-700"
                    >
                      {album.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-800">
              <div className="flex justify-between mb-1">
                <span>Resolution</span>
                <span>{image.width && image.height ? `${image.width} × ${image.height}` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Size</span>
                <span>
                  {image.image_size ? `${(image.image_size / 1024 / 1024).toFixed(2)} MB` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
