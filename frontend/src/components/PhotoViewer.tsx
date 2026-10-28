import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  FolderPlus,
  Heart,
  Info,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Image } from '@/types';
import { cn } from '@/lib/utils';
import { AddToAlbumDialog } from './AddToAlbumDialog';
import { formatDuration } from './PhotoGrid';
import { ConfirmDialog } from './ConfirmDialog';

/** Buttons only appear for the actions that are passed (none on the read-only demo). */
export interface ViewerActions {
  onToggleFavorite?: (id: number) => void;
  canAddToAlbum?: boolean;
  onDelete?: (id: number) => void;
  /** e.g. "Remove from album": shown instead of Delete when provided. */
  remove?: { label: string; onRemove: (id: number) => void };
}

interface PhotoViewerProps extends ViewerActions {
  images: Image[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const formatBytes = (n: number) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

/** Full-screen photo viewer: ← → to browse, I for info, Esc to close. */
export function PhotoViewer({
  images,
  index,
  onIndexChange,
  onClose,
  onToggleFavorite,
  canAddToAlbum = false,
  onDelete,
  remove,
}: PhotoViewerProps) {
  const image = images[index];
  const [showInfo, setShowInfo] = useState(() => window.innerWidth >= 1024);
  const [addingToAlbum, setAddingToAlbum] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const dialogOpen = addingToAlbum || confirmingDelete;

  useEffect(() => {
    if (dialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasPrev) onIndexChange(index - 1);
      else if (e.key === 'ArrowRight' && hasNext) onIndexChange(index + 1);
      else if (e.key.toLowerCase() === 'i') setShowInfo((s) => !s);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, hasPrev, hasNext, onIndexChange, onClose, dialogOpen]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // The photo can disappear (deleted / removed); close if nothing is left.
  useEffect(() => {
    if (!image) onClose();
  }, [image, onClose]);
  if (!image) return null;

  const iconButton = 'grid h-10 w-10 place-items-center rounded-full text-white/90 hover:bg-white/15';

  return (
    <div className="fixed inset-0 z-50 flex bg-black" role="dialog" aria-modal aria-label={image.filename}>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1 bg-gradient-to-b from-black/60 to-transparent p-2">
          <button className={iconButton} onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-1">
            {onToggleFavorite && (
            <button
              className={iconButton}
              onClick={() => onToggleFavorite(image.id)}
              aria-label={image.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={cn('h-5 w-5', image.is_favorite && 'fill-current')} />
            </button>
            )}
            <a className={iconButton} href={image.full_url} download={image.filename} aria-label="Download">
              <Download className="h-5 w-5" />
            </a>
            {canAddToAlbum && (
            <button className={iconButton} onClick={() => setAddingToAlbum(true)} aria-label="Add to album">
              <FolderPlus className="h-5 w-5" />
            </button>
            )}
            {(remove || onDelete) && (
              <button
                className={iconButton}
                onClick={() => (remove ? remove.onRemove(image.id) : setConfirmingDelete(true))}
                aria-label={remove?.label ?? 'Delete'}
                title={remove?.label ?? 'Delete'}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              className={cn(iconButton, showInfo && 'bg-white/15')}
              onClick={() => setShowInfo((s) => !s)}
              aria-label="Info"
              aria-pressed={showInfo}
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* min-h-0 lets this flex child shrink, so tall photos fit instead of overflowing. */}
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 pt-14">
          {image.media_type === 'video' ? (
            <VideoPlayer key={image.id} image={image} />
          ) : (
            <img
              key={image.id}
              src={image.full_url}
              alt={image.filename}
              className="max-h-full max-w-full object-contain"
              style={{ backgroundImage: `url("${image.thumbnail_url}")`, backgroundSize: 'cover' }}
            />
          )}
        </div>

        {hasPrev && (
          <button
            className={cn(iconButton, 'absolute left-3 top-1/2 -translate-y-1/2 bg-black/30')}
            onClick={() => onIndexChange(index - 1)}
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {hasNext && (
          <button
            className={cn(iconButton, 'absolute right-3 top-1/2 -translate-y-1/2 bg-black/30')}
            onClick={() => onIndexChange(index + 1)}
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {showInfo && <InfoPanel image={image} onClose={() => setShowInfo(false)} />}

      <AddToAlbumDialog imageIds={[image.id]} open={addingToAlbum} onOpenChange={setAddingToAlbum} />
      {onDelete && (
        <ConfirmDialog
          open={confirmingDelete}
          onOpenChange={setConfirmingDelete}
          title="Delete this photo?"
          description="It's removed from your library and every album. This can't be undone."
          confirmLabel="Delete"
          onConfirm={() => onDelete(image.id)}
        />
      )}
    </div>
  );
}

/**
 * Plays the original file. Browsers can't all decode every format (iPhone HEVC
 * often fails on Windows/Linux), so on error we offer a download instead of a
 * broken player. Videos are never converted on the server.
 */
function VideoPlayer({ image }: { image: Image }) {
  const [unsupported, setUnsupported] = useState(false);

  if (unsupported) {
    return (
      <div className="max-w-sm text-center text-white">
        <Film className="mx-auto mb-3 h-10 w-10 opacity-70" />
        <p className="font-medium">This browser can't play this video format</p>
        <p className="mt-1 text-sm text-white/70">It's probably HEVC, common on iPhones. Download it to watch.</p>
        <a
          href={image.full_url}
          download={image.filename}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
        >
          <Download className="h-4 w-4" /> Download
        </a>
      </div>
    );
  }

  return (
    <video
      src={image.full_url}
      poster={image.width ? image.thumbnail_url : undefined}
      controls
      autoPlay
      playsInline
      onError={() => setUnsupported(true)}
      className="max-h-full max-w-full"
    />
  );
}

function Row({ icon: Icon, children }: { icon: typeof Camera; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

function InfoPanel({ image, onClose }: { image: Image; onClose: () => void }) {
  const taken = image.date_taken ? parseISO(image.date_taken) : null;
  const exposure = [
    image.f_number && `ƒ/${image.f_number}`,
    image.exposure_time,
    image.focal_length,
    image.iso && `ISO ${image.iso}`,
  ].filter(Boolean);
  const hasGps = image.latitude != null && image.longitude != null;

  return (
    <aside className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-background p-6 text-foreground sm:static sm:w-80">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Info</h2>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close info">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-base font-medium">
            {taken ? format(taken, 'EEE, MMM d, yyyy') : 'Date unknown'}
          </p>
          <p className="text-sm text-muted-foreground">
            {taken ? format(taken, 'h:mm a') : `Uploaded ${format(parseISO(image.upload_date), 'MMM d, yyyy')}`}
          </p>
        </div>

        <Row icon={Info}>
          <p className="break-all font-medium">{image.filename}</p>
          <p className="text-muted-foreground">
            {[
              image.width && image.height && `${image.width} × ${image.height}`,
              image.duration && formatDuration(image.duration),
              image.image_size && formatBytes(image.image_size),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </Row>

        {(image.camera_model || exposure.length > 0) && (
          <Row icon={Camera}>
            <p className="font-medium">{image.camera_model ?? 'Unknown camera'}</p>
            {image.lens_model && <p className="text-muted-foreground">{image.lens_model}</p>}
            {exposure.length > 0 && <p className="text-muted-foreground">{exposure.join('  ·  ')}</p>}
          </Row>
        )}

        {hasGps && (
          <Row icon={MapPin}>
            <p className="font-medium">{image.address ?? 'Looking up address…'}</p>
            <p className="text-muted-foreground">
              {image.latitude!.toFixed(5)}, {image.longitude!.toFixed(5)}
            </p>
            <Link to="/map" className="text-primary hover:underline">
              Show on map
            </Link>
          </Row>
        )}

        <Integrity image={image} />

        {image.albums.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Albums</h3>
            <div className="flex flex-wrap gap-2">
              {image.albums.map((a) => (
                <Link key={a.id} to={`/albums/${a.id}`} className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-accent">
                  {a.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {image.tags.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {image.tags.map((t) => (
                <Link
                  key={t.id}
                  to={`/search?q=${encodeURIComponent(t.name)}`}
                  className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-accent"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Results of photostack/integrity.py, in plain words. */
function Integrity({ image }: { image: Image }) {
  if (!image.sha256) return null;
  const warnings = [
    image.edited_with && `Edited with ${image.edited_with}`,
    image.trailing_bytes ? `${formatBytes(image.trailing_bytes)} of extra data after the image ends` : null,
  ].filter(Boolean);
  const ok = warnings.length === 0;

  return (
    <Row icon={ok ? ShieldCheck : ShieldAlert}>
      <p className="font-medium">{ok ? 'No signs of editing' : 'Integrity notes'}</p>
      {warnings.map((w) => (
        <p key={w as string} className="text-muted-foreground">
          {w}
        </p>
      ))}
      <p className="mt-1 font-mono text-xs text-muted-foreground" title={image.sha256}>
        SHA-256 {image.sha256.slice(0, 16)}…
      </p>
    </Row>
  );
}
