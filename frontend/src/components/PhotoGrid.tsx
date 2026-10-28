import { format, isThisYear, parseISO } from 'date-fns';
import { Check, Heart, Loader2, TriangleAlert } from 'lucide-react';
import { Image } from '@/types';
import { cn } from '@/lib/utils';

/** The date a photo belongs to in the timeline: when it was taken, else when uploaded. */
export const photoDate = (img: Image) => img.date_taken ?? img.upload_date;

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
  onToggleSelect: (id: number) => void;
  onOpen: (image: Image) => void;
  onToggleFavorite: (id: number) => void;
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
  const ratio = Math.min(Math.max((image.width ?? 1) / (image.height ?? 1), 0.5), 2.5);
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
        onClick={() => (selecting ? onToggleSelect(image.id) : onOpen(image))}
        className="absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary"
        aria-label={`Open ${image.filename}`}
      >
        {isReady && (
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

      {!selecting && (
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
