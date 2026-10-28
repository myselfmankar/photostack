import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { useAlbum, useDeleteAlbum, useRemoveImagesFromAlbum, useUpdateAlbum } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState, GridSkeleton, Page } from '@/components/Page';
import { PhotoBrowser } from '@/components/PhotoBrowser';

const plural = (n: number) => `${n} photo${n === 1 ? '' : 's'}`;

/** A user-created album: rename, delete, and remove photos (photos stay in the library). */
export function CustomAlbum() {
  const albumId = Number(useParams<{ id: string }>().id);
  const navigate = useNavigate();
  const { data: album, isLoading, isError } = useAlbum(albumId);
  const updateAlbum = useUpdateAlbum();
  const deleteAlbum = useDeleteAlbum();
  const removeImages = useRemoveImagesFromAlbum();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <Page title=" ">
        <GridSkeleton />
      </Page>
    );
  }
  if (isError || !album) {
    return (
      <Page>
        <EmptyState icon={FolderOpen} title="Album not found">
          <Button asChild variant="outline" className="mt-4 rounded-full">
            <Link to="/albums">Back to albums</Link>
          </Button>
        </EmptyState>
      </Page>
    );
  }

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = editingName?.trim();
    if (!name || name === album.name) return setEditingName(null);
    try {
      await updateAlbum.mutateAsync({ id: album.id, name });
      setEditingName(null);
    } catch {
      toast.error('Could not rename the album');
    }
  };

  const remove = async (imageIds: number[]) => {
    try {
      await removeImages.mutateAsync({ albumId: album.id, imageIds });
      toast.success(`Removed ${plural(imageIds.length)} from “${album.name}”`);
    } catch {
      toast.error('Could not remove photos');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAlbum.mutateAsync(album.id);
      toast.success(`Deleted “${album.name}”`);
      navigate('/albums');
    } catch {
      toast.error('Could not delete the album');
    }
  };

  const title =
    editingName !== null ? (
      <form onSubmit={saveName} className="flex max-w-md gap-2">
        <Input
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setEditingName(null)}
          maxLength={100}
          autoFocus
          className="h-10 text-lg"
        />
        <Button type="submit" disabled={updateAlbum.isPending}>
          Save
        </Button>
      </form>
    ) : (
      <span className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="-ml-2 rounded-full">
          <Link to="/albums" aria-label="Back to albums">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        {album.name}
      </span>
    );

  return (
    <Page
      title={title}
      subtitle={plural(album.images.length)}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => setEditingName(album.name)}>
            <Pencil className="h-4 w-4" /> Rename
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete album
          </Button>
        </>
      }
    >
      {album.images.length > 0 ? (
        <PhotoBrowser images={album.images} remove={{ label: 'Remove from album', onRemove: remove }} />
      ) : (
        <EmptyState icon={FolderOpen} title="This album is empty">
          On the{' '}
          <Link to="/" className="text-primary underline">
            Photos
          </Link>{' '}
          page, tick the circle on a few photos, then choose “Add to album”.
        </EmptyState>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${album.name}”?`}
        description={`Only the album is deleted. Its ${album.images.length === 1 ? 'photo stays' : 'photos stay'} in your library.`}
        confirmLabel="Delete album"
        onConfirm={handleDelete}
      />
    </Page>
  );
}
