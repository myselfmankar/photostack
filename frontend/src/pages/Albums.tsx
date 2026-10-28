import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FolderOpen, Plus } from 'lucide-react';
import { useAlbums, useCreateAlbum, useDemoMode, useMonthAlbums } from '@/hooks/useApi';
import { MonthAlbum } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Page } from '@/components/Page';

const plural = (n: number) => `${n} photo${n === 1 ? '' : 's'}`;

function AlbumTile({ to, cover, title, subtitle }: { to: string; cover: string | null; title: string; subtitle: string }) {
  return (
    <Link to={to} className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="aspect-square overflow-hidden rounded-xl bg-muted">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <FolderOpen className="h-10 w-10" />
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </Link>
  );
}

const tileGrid = 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6';

function NewAlbumDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState('');
  const createAlbum = useCreateAlbum();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const album = await createAlbum.mutateAsync({ name: name.trim() });
      setName('');
      onOpenChange(false);
      navigate(`/albums/${album.id}`);
    } catch {
      toast.error('Could not create the album');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New album</DialogTitle>
          </DialogHeader>
          <Input placeholder="Album name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || createAlbum.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Albums() {
  const { data: albums = [], isLoading } = useAlbums();
  const { data: months = [] } = useMonthAlbums();
  const [creating, setCreating] = useState(false);
  const demo = useDemoMode();

  const years = Object.entries(
    months.reduce<Record<number, MonthAlbum[]>>((acc, m) => {
      (acc[m.year] ??= []).push(m);
      return acc;
    }, {})
  ).sort(([a], [b]) => Number(b) - Number(a));

  return (
    <Page
      title="Albums"
      actions={
        !demo && (
          <Button onClick={() => setCreating(true)} className="gap-2 rounded-full">
            <Plus className="h-4 w-4" /> New album
          </Button>
        )
      }
    >
      <div className="space-y-10">
        <section>
          {isLoading ? (
            <div className={tileGrid}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : albums.length > 0 ? (
            <div className={tileGrid}>
              {albums.map((a) => (
                <AlbumTile key={a.id} to={`/albums/${a.id}`} cover={a.cover_url} title={a.name} subtitle={plural(a.image_count)} />
              ))}
            </div>
          ) : demo ? null : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-4 rounded-xl border border-dashed p-5 text-left hover:bg-muted"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Create your first album</p>
                <p className="text-sm text-muted-foreground">
                  Or tick photos on the Photos page and choose “Add to album”.
                </p>
              </div>
            </button>
          )}
        </section>

        {years.map(([year, ms]) => (
          <section key={year}>
            <h2 className="mb-1 text-lg font-semibold">{year}</h2>
            <p className="mb-4 text-sm text-muted-foreground">Grouped automatically by when photos were taken</p>
            <div className={tileGrid}>
              {ms.map((m) => (
                <AlbumTile
                  key={`${m.year}-${m.month}`}
                  to={`/albums/${m.year}/${m.month}`}
                  cover={m.preview_image_url}
                  title={m.month_name}
                  subtitle={plural(m.image_count)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <NewAlbumDialog open={creating} onOpenChange={setCreating} />
    </Page>
  );
}
