import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CircleAlert, ImagePlus, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Page } from '@/components/Page';
import { cn } from '@/lib/utils';

// Must match photostack/storage.py SUPPORTED_EXTENSIONS.
const ACCEPTED = ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.mp4', '.mov', '.m4v', '.webm'];
const PARALLEL = 3;

interface Item {
  id: string;
  file: File;
  progress: number;
  status: 'waiting' | 'uploading' | 'done' | 'error';
  error?: string;
}

const isAccepted = (f: File) => ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext));

/** Drop files (or pick them) and they upload right away, a few at a time. */
export function Upload() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const queue = useRef<Item[]>([]);
  const active = useRef(0);
  const queryClient = useQueryClient();

  const update = (id: string, change: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...change } : i)));

  const pump = () => {
    while (active.current < PARALLEL && queue.current.length > 0) {
      const item = queue.current.shift()!;
      active.current++;
      update(item.id, { status: 'uploading' });
      apiClient
        .uploadImageWithProgress(item.file, (progress) => update(item.id, { progress }))
        .then(() => update(item.id, { status: 'done', progress: 100 }))
        .catch((e: Error) => update(item.id, { status: 'error', error: e.message }))
        .finally(() => {
          active.current--;
          if (active.current === 0 && queue.current.length === 0) queryClient.invalidateQueries();
          pump();
        });
    }
  };

  const add = (files: FileList | null) => {
    if (!files) return;
    const added: Item[] = [...files].map((file) => ({
      id: `${file.name}-${file.size}-${Math.random()}`,
      file,
      progress: 0,
      ...(isAccepted(file)
        ? { status: 'waiting' as const }
        : { status: 'error' as const, error: 'Not supported (photos: JPG, PNG, HEIC; videos: MP4, MOV, WebM)' }),
    }));
    setItems((prev) => [...added, ...prev]);
    queue.current.push(...added.filter((i) => i.status === 'waiting'));
    pump();
  };

  const done = items.filter((i) => i.status === 'done').length;
  const busy = items.some((i) => i.status === 'waiting' || i.status === 'uploading');

  return (
    <Page title="Upload" subtitle="Photos (JPG, PNG, HEIC) and videos (MP4, MOV, WebM). Dates and places are read automatically.">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors',
          dragging ? 'border-primary bg-accent' : 'hover:bg-muted'
        )}
      >
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground">
          <ImagePlus className="h-6 w-6" />
        </div>
        <p className="font-medium">Drop photos and videos here, or click to choose</p>
        <p className="mt-1 text-sm text-muted-foreground">They upload straight away</p>
        <input
          type="file"
          multiple
          accept={[...ACCEPTED, 'image/heic', 'image/heif', 'video/*'].join(',')}
          className="sr-only"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {items.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {busy ? `Uploading… ${done} of ${items.length} done` : `${done} of ${items.length} uploaded`}
            </p>
            {!busy && done > 0 && (
              <Button asChild size="sm" className="rounded-full">
                <Link to="/">View photos</Link>
              </Button>
            )}
          </div>
          <ul className="divide-y rounded-xl border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                {item.status === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                ) : item.status === 'error' ? (
                  <CircleAlert className="h-5 w-5 shrink-0 text-destructive" />
                ) : (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.file.name}</p>
                  {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                  {item.status === 'uploading' && (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {(item.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  );
}
