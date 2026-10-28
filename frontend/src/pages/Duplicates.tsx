import { useState } from 'react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Copy } from 'lucide-react';
import { useBatchDeleteImages, useDemoMode, useDuplicateImageGroups } from '@/hooks/useApi';
import { Image } from '@/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState, GridSkeleton, Page } from '@/components/Page';
import { cn } from '@/lib/utils';

const formatSize = (n: number | null) => (n ? `${(n / 1024 / 1024).toFixed(1)} MB` : '');

/**
 * Groups of photos that look the same (same visual fingerprint), oldest first.
 * The oldest upload is treated as the original.
 */
export function Duplicates() {
  const { data: groups = [], isLoading } = useDuplicateImageGroups();
  const batchDelete = useBatchDeleteImages();
  const demo = useDemoMode();
  const [pending, setPending] = useState<Image[] | null>(null);

  const deleteCopies = async (copies: Image[]) => {
    try {
      await batchDelete.mutateAsync(copies.map((i) => i.id));
      toast.success(`Deleted ${copies.length} duplicate${copies.length === 1 ? '' : 's'}`);
    } catch {
      toast.error('Could not delete duplicates');
    }
  };

  const allCopies = groups.flatMap((g) => g.slice(1));

  return (
    <Page
      title="Duplicates"
      subtitle={
        groups.length > 0 &&
        `${groups.length} group${groups.length === 1 ? '' : 's'} of photos that look the same`
      }
      actions={
        !demo && groups.length > 1 && (
          <Button variant="outline" className="rounded-full" onClick={() => setPending(allCopies)}>
            Delete all {allCopies.length} copies
          </Button>
        )
      }
    >
      {isLoading ? (
        <GridSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState icon={Copy} title="No duplicates found">
          Photos that look the same (even resized or re-saved) are grouped here.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group[0].id} className="rounded-xl border p-4">
              <div className="flex gap-3 overflow-x-auto pb-1">
                {group.map((img, i) => (
                  <figure key={img.id} className="w-40 shrink-0">
                    <img
                      src={img.thumbnail_url}
                      alt=""
                      className={cn('aspect-square w-full rounded-lg object-cover', i === 0 && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}
                    />
                    <figcaption className="mt-2 text-xs">
                      <p className="truncate font-medium" title={img.filename}>
                        {img.filename}
                      </p>
                      <p className="text-muted-foreground">
                        {i === 0 ? 'Original · ' : ''}
                        {[img.width && `${img.width}×${img.height}`, formatSize(img.image_size)].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-muted-foreground">Added {format(parseISO(img.upload_date), 'MMM d, yyyy')}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className={cn('mt-3 flex justify-end', demo && 'hidden')}>
                <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setPending(group.slice(1))}>
                  Keep original, delete {group.length - 1} cop{group.length === 2 ? 'y' : 'ies'}
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={`Delete ${pending?.length ?? 0} duplicate${pending?.length === 1 ? '' : 's'}?`}
        description="The original (highlighted) is kept. The copies are removed from your library and albums."
        confirmLabel="Delete copies"
        onConfirm={() => pending && deleteCopies(pending)}
      />
    </Page>
  );
}
