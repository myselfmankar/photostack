import { useState } from 'react';
import { toast } from 'sonner';
import { FolderPlus, Plus } from 'lucide-react';
import { useAddImagesToAlbum, useAlbums, useCreateAlbum } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface AddToAlbumDialogProps {
  imageIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/** Pick an existing album, or name a new one, and add the given photos to it. */
export function AddToAlbumDialog({ imageIds, open, onOpenChange, onDone }: AddToAlbumDialogProps) {
  const { data: albums = [] } = useAlbums();
  const addImages = useAddImagesToAlbum();
  const createAlbum = useCreateAlbum();
  const [newName, setNewName] = useState('');
  const busy = addImages.isPending || createAlbum.isPending;
  const photos = `${imageIds.length} photo${imageIds.length === 1 ? '' : 's'}`;

  const addTo = async (albumId: number, albumName: string) => {
    try {
      await addImages.mutateAsync({ albumId, imageIds });
      toast.success(`Added ${photos} to “${albumName}”`);
      onOpenChange(false);
      onDone?.();
    } catch {
      toast.error('Could not add photos to the album');
    }
  };

  const createAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      const album = await createAlbum.mutateAsync({ name });
      setNewName('');
      await addTo(album.id, album.name);
    } catch {
      toast.error('Could not create the album');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to album</DialogTitle>
          <DialogDescription>Add {photos} to an album. They stay in your library too.</DialogDescription>
        </DialogHeader>

        <form onSubmit={createAndAdd} className="flex gap-2">
          <Input
            placeholder="New album name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={100}
            autoFocus
          />
          <Button type="submit" disabled={busy || !newName.trim()} className="gap-1 shrink-0">
            <Plus className="h-4 w-4" /> Create
          </Button>
        </form>

        {albums.length > 0 && (
          <ul className="max-h-72 overflow-y-auto -mx-2">
            {albums.map((album) => (
              <li key={album.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => addTo(album.id, album.name)}
                  className="w-full flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted disabled:opacity-50"
                >
                  {album.cover_url ? (
                    <img src={album.cover_url} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted grid place-items-center">
                      <FolderPlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="flex-1 truncate">{album.name}</span>
                  <span className="text-xs text-muted-foreground">{album.image_count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
