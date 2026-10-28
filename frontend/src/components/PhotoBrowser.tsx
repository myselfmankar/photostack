import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FolderPlus, Heart, Loader2, Trash2, X } from 'lucide-react';
import { Image } from '@/types';
import {
  useBatchDeleteImages,
  useBatchToggleFavoriteStatus,
  useDemoMode,
  useToggleFavorite,
} from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { AddToAlbumDialog } from './AddToAlbumDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { PhotoGrid } from './PhotoGrid';
import { PhotoViewer, ViewerActions } from './PhotoViewer';

interface PhotoBrowserProps {
  images: Image[];
  byDay?: boolean;
  /** Infinite scroll: called when the bottom of the grid comes into view. */
  loadMore?: () => void;
  loadingMore?: boolean;
  /** e.g. "Remove from album" in place of Delete. */
  remove?: { label: string; onRemove: (ids: number[]) => void };
}

const plural = (n: number) => `${n} photo${n === 1 ? '' : 's'}`;

/**
 * Grid + viewer + selection, shared by every page that lists photos.
 * Pages only fetch their photos; selecting, favoriting, deleting and
 * adding to albums all behave the same everywhere.
 */
export function PhotoBrowser({ images, byDay, loadMore, loadingMore, remove }: PhotoBrowserProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openId, setOpenId] = useState<number | null>(null);
  const [addingToAlbum, setAddingToAlbum] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const favorite = useToggleFavorite();
  const batchFavorite = useBatchToggleFavoriteStatus();
  const batchDelete = useBatchDeleteImages();
  const demo = useDemoMode();

  const ids = [...selected];
  const clear = () => setSelected(new Set());
  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  // Drop selections for photos that are gone (deleted, removed from album).
  useEffect(() => {
    const present = new Set(images.map((i) => i.id));
    setSelected((prev) => {
      const kept = [...prev].filter((id) => present.has(id));
      return kept.length === prev.size ? prev : new Set(kept);
    });
  }, [images]);

  const deletePhotos = async (toDelete: number[]) => {
    try {
      await batchDelete.mutateAsync(toDelete);
      toast.success(`Deleted ${plural(toDelete.length)}`);
      clear();
    } catch {
      toast.error('Could not delete');
    }
  };

  const removePhotos = (toRemove: number[]) => {
    remove?.onRemove(toRemove);
    clear();
  };

  // The read-only demo gets no actions at all, so no edit buttons are drawn.
  const viewerActions: ViewerActions = demo
    ? {}
    : {
        onToggleFavorite: (id) => favorite.mutate(id),
        canAddToAlbum: true,
        ...(remove
          ? { remove: { label: remove.label, onRemove: (id) => removePhotos([id]) } }
          : { onDelete: (id) => deletePhotos([id]) }),
      };

  const openIndex = images.findIndex((i) => i.id === openId);

  return (
    <>
      {selected.size > 0 && (
        <div className="sticky top-16 z-30 -mx-4 mb-3 flex items-center gap-2 bg-background/95 px-4 py-2 backdrop-blur lg:-mx-6 lg:px-6">
          <Button variant="ghost" size="icon" onClick={clear} aria-label="Clear selection">
            <X className="h-5 w-5" />
          </Button>
          <span className="font-medium">{selected.size} selected</span>
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" className="gap-2" onClick={() => batchFavorite.mutate(ids)}>
              <Heart className="h-4 w-4" /> <span className="hidden sm:inline">Favorite</span>
            </Button>
            <Button variant="ghost" className="gap-2" onClick={() => setAddingToAlbum(true)}>
              <FolderPlus className="h-4 w-4" /> <span className="hidden sm:inline">Add to album</span>
            </Button>
            {remove ? (
              <Button variant="ghost" className="gap-2" onClick={() => removePhotos(ids)}>
                <X className="h-4 w-4" /> <span className="hidden sm:inline">{remove.label}</span>
              </Button>
            ) : (
              <Button variant="ghost" className="gap-2 text-destructive" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
          </div>
        </div>
      )}

      <PhotoGrid
        images={images}
        byDay={byDay}
        selected={selected}
        onToggleSelect={demo ? undefined : toggleSelect}
        onOpen={(img) => setOpenId(img.id)}
        onToggleFavorite={demo ? undefined : (id) => favorite.mutate(id)}
      />

      {loadMore && <LoadMoreSentinel onVisible={loadMore} loading={loadingMore} />}

      {openIndex >= 0 && (
        <PhotoViewer
          images={images}
          index={openIndex}
          onIndexChange={(i) => setOpenId(images[i].id)}
          onClose={() => setOpenId(null)}
          {...viewerActions}
        />
      )}

      <AddToAlbumDialog imageIds={ids} open={addingToAlbum} onOpenChange={setAddingToAlbum} onDone={clear} />
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete ${plural(selected.size)}?`}
        description="They're removed from your library and every album. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => deletePhotos(ids)}
      />
    </>
  );
}

function LoadMoreSentinel({ onVisible, loading }: { onVisible: () => void; loading?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && onVisible(), {
      rootMargin: '600px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div ref={ref} className="flex h-16 items-center justify-center text-muted-foreground">
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
    </div>
  );
}
