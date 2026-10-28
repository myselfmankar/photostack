import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Calendar, FolderOpen, Plus } from 'lucide-react';
import { useAlbums, useCreateAlbum, useMonthAlbums } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

function AlbumTile({ to, cover, title, subtitle }: { to: string; cover: string | null; title: string; subtitle: string }) {
  return (
    <Link to={to} className="group block">
      <div className="aspect-square overflow-hidden rounded-lg bg-neutral-800">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center">
            <FolderOpen className="h-10 w-10 text-neutral-600" />
          </div>
        )}
      </div>
      <p className="mt-2 truncate font-medium">{title}</p>
      <p className="text-sm text-neutral-500">{subtitle}</p>
    </Link>
  );
}

const count = (n: number) => `${n} photo${n === 1 ? '' : 's'}`;

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
  const { data: albums, isLoading: albumsLoading } = useAlbums();
  const { data: months, isLoading: monthsLoading } = useMonthAlbums();
  const [creating, setCreating] = useState(false);

  const monthsByYear = Object.entries(
    (months ?? []).reduce<Record<number, typeof months>>((acc, m) => {
      (acc[m.year] ??= []).push(m);
      return acc;
    }, {})
  ).sort(([a], [b]) => Number(b) - Number(a));

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Albums</h1>
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New album
          </Button>
        </div>

        {albumsLoading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square bg-neutral-800" />)}
          </div>
        ) : albums && albums.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
            {albums.map((a) => (
              <AlbumTile key={a.id} to={`/albums/${a.id}`} cover={a.cover_url} title={a.name} subtitle={count(a.image_count)} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-800 py-10 text-center">
            <FolderOpen className="mx-auto mb-3 h-10 w-10 text-neutral-600" />
            <p className="font-medium">No albums yet</p>
            <p className="mt-1 text-sm text-neutral-500">
              Create one here, or select photos in the gallery and choose “Add to album”.
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-xl font-semibold">
          <Calendar className="h-5 w-5 text-neutral-400" /> By month
        </h2>
        <p className="mb-6 text-sm text-neutral-500">Created automatically from when each photo was taken.</p>

        {monthsLoading ? (
          <Skeleton className="h-48 bg-neutral-800" />
        ) : monthsByYear.length === 0 ? (
          <p className="text-sm text-neutral-500">Photos with a date taken will show up here.</p>
        ) : (
          <div className="space-y-8">
            {monthsByYear.map(([year, ms]) => (
              <div key={year}>
                <h3 className="mb-4 text-lg font-medium text-neutral-300">{year}</h3>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
                  {ms!.map((m) => (
                    <AlbumTile
                      key={`${m.year}-${m.month}`}
                      to={`/albums/${m.year}/${m.month}`}
                      cover={m.preview_image_url}
                      title={m.month_name}
                      subtitle={count(m.image_count)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <NewAlbumDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
