import { format, isThisYear, parseISO } from 'date-fns';
import { Check, Film, Heart, Loader2, Play, TriangleAlert } from 'lucide-react';
import { Image } from '@/types';
import { cn } from '@/lib/utils';

/** The date a photo belongs to in the timeline: when it was taken, else when uploaded. */
export const photoDate = (img: Image) => img.date_taken ?? img.upload_date;

/** 75 -> "1:15" */
export const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

function dayLabel(day: string) {
  const date = parseISO(day);
  return format(date, isThisYear(date) ? 'EEE, MMM d' : 'EEE, MMM d, yyyy');
}

function groupByDay(images: Image[]) {
  const groups: { day: string; images: Image[] }[] = [];
  for (const img of images) {
    const day = photoDate(img).slice(0, 10);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.images.push(img);
    else groups.push({ day, images: [img] });
  }
  return groups;
}

interface PhotoGridProps {
  images: Image[];
  /** Show "Mon, Nov 17" headings between days. */
  byDay?: boolean;
  selected: Set<number>;
  /** Omit to make the grid view-only (no select circles or hearts). */
  onToggleSelect?: (id: number) => void;
  onOpen: (image: Image) => void;
  onToggleFavorite?: (id: number) => void;
}

/**
 * Photos keep their real shape: each tile is (row height x aspect ratio) wide.
 *
 * - Flat list: rows are justified, as in Google Photos. flex-grow stretches each
 *   row to the full width; a trailing filler stops the last row stretching.
 * - By day (Immich style): days flow side by side, so a day with one photo
 *   doesn't take a whole row. Tiles keep a fixed height there.
 */
export function PhotoGrid({ images, byDay = false, ...tileProps }: PhotoGridProps) {
  const selecting = tileProps.selected.size > 0;
  const rowHeight = '[--row:120px] sm:[--row:170px] lg:[--row:200px]';

  if (!byDay) {
    return (
      <div className={cn('flex flex-wrap gap-1', rowHeight)}>
        {images.map((img) => (
          <Tile key={img.id} image={img} selecting={selecting} justify {...tileProps} />
        ))}
        <div className="grow-[999]" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-x-5 gap-y-6', rowHeight)}>
      {groupByDay(images).map(({ day, images: dayImages }) => (
        <section key={day} className="max-w-full">
          <h2 className="mb-2 text-sm font-medium">{dayLabel(day)}</h2>
          <div className="flex flex-wrap gap-1">
            {dayImages.map((img) => (
              <Tile key={img.id} image={img} selecting={selecting} {...tileProps} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Tile({
  image,
  selecting,
  selected,
  onToggleSelect,
  onOpen,
  onToggleFavorite,
  justify = false,
}: Omit<PhotoGridProps, 'images' | 'byDay'> & { image: Image; selecting: boolean; justify?: boolean }) {
  const isVideo = image.media_type === 'video';
  // Videos indexed without ffmpeg have no size or thumbnail: show them 16:9 with an icon.
  const hasThumbnail = !isVideo || image.width !== null;
  const ratio = image.width && image.height
    ? Math.min(Math.max(image.width / image.height, 0.5), 2.5)
    : isVideo ? 16 / 9 : 1;
  const isSelected = selected.has(image.id);
  const isReady = image.status === 'completed';

  return (
    <div
      className="group relative overflow-hidden bg-muted"
      style={
        justify
          ? { flexGrow: ratio, width: `calc(var(--row) * ${ratio})`, aspectRatio: ratio }
          : { width: `calc(var(--row) * ${ratio})`, height: 'var(--row)' }
      }
    >
      <button
        type="button"
        onClick={() => (selecting && onToggleSelect ? onToggleSelect(image.id) : onOpen(image))}
        className="absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary"
        aria-label={`Open ${image.filename}`}
      >
        {isReady && !hasThumbnail && (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Film className="h-8 w-8" />
          </div>
        )}
        {isReady && hasThumbnail && (
          <img
            src={image.thumbnail_url}
            alt=""
            loading="lazy"
            className={cn(
              'h-full w-full object-cover transition-transform duration-150',
              isSelected && 'scale-[0.88] rounded-md'
            )}
          />
        )}
      </button>

      {isVideo && isReady && (
        <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white">
          <Play className="h-3 w-3 fill-current" />
          {image.duration ? formatDuration(image.duration) : 'Video'}
        </span>
      )}

      {image.status === 'processing' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {image.status === 'failed' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center gap-1 text-center text-xs text-muted-foreground">
          <TriangleAlert className="h-5 w-5" />
        </div>
      )}

      {/* Hover shade so the white icons stay readable on bright photos. */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100',
          selecting && 'opacity-100'
        )}
      />

      {onToggleSelect && (
      <button
        type="button"
        onClick={() => onToggleSelect(image.id)}
        aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
        aria-pressed={isSelected}
        className={cn(
          'absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 transition-opacity',
          isSelected
            ? 'border-primary bg-primary text-primary-foreground opacity-100'
            : 'border-white/90 text-transparent opacity-0 hover:bg-white/20 group-hover:opacity-100',
          selecting && 'opacity-100'
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </button>
      )}

      {!selecting && onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(image.id)}
          aria-label={image.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          className={cn(
            'absolute bottom-2 left-2 transition-opacity',
            image.is_favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <Heart
            className={cn('h-5 w-5 drop-shadow', image.is_favorite ? 'fill-white text-white' : 'text-white')}
          />
        </button>
      )}
    </div>
  );
}
