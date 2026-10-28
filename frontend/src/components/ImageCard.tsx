import { Image as ImageType } from '@/types';
import { Heart, MoreVertical, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface ImageCardProps {
  image: ImageType;
  onClick?: () => void;
  onFavoriteToggle?: (id: number) => void;
  onDelete?: (id: number) => void;
  /** Label for the menu action that calls onDelete. */
  deleteLabel?: string;
  isFavorite?: boolean;
  isLoading?: boolean;
  className?: string;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: number, isSelected: boolean) => void;
}

export function ImageCard({
  image,
  onClick,
  onFavoriteToggle,
  onDelete,
  deleteLabel = 'Delete',
  isFavorite = false,
  isLoading = false,
  className,
  selectable = false,
  isSelected = false,
  onSelect,
}: ImageCardProps) {
  // Use thumbnail for grid view (better performance)
  const imageUrl = image.thumbnail_url;
  const isProcessing = image.status === 'processing';

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(image.id, !isSelected);
    } else {
      onClick?.();
    }
  };

  return (
    <div
      className={cn(
        'group relative aspect-square overflow-hidden rounded-lg bg-neutral-900 transition-all duration-300',
        selectable ? 'cursor-pointer' : 'hover:shadow-lg hover:shadow-neutral-600/20',
        isLoading && 'opacity-50 pointer-events-none',
        selectable && isSelected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-950',
        className
      )}
      onClick={handleClick}
    >
      <img
        src={imageUrl}
        alt={image.filename}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />

      {selectable && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect?.(image.id, !!checked)}
            onClick={(e) => e.stopPropagation()} // Prevent card click when checkbox is clicked
            className="w-6 h-6 rounded-full border-neutral-400 bg-neutral-900 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
          />
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-white text-sm">
            <Zap className="h-4 w-4 animate-pulse" />
            Processing
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-3 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
        <span className="text-xs text-neutral-300 truncate max-w-[60%]">
          {image.filename}
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle?.(image.id);
            }}
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-colors',
                isFavorite || image.is_favorite
                  ? 'fill-red-500 text-red-500'
                  : 'text-neutral-400 hover:text-red-500'
              )}
            />
          </Button>

          {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-5 w-5 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(image.id);
                }}
                className="text-red-500"
              >
                {deleteLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </div>

      {image.tags.length > 0 && (
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {image.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="inline-block px-2 py-1 text-xs bg-neutral-800/80 text-neutral-300 rounded"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
