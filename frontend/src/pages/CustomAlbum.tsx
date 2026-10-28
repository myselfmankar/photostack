import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import {
  useAlbum,
  useDeleteAlbum,
  useRemoveImagesFromAlbum,
  useToggleFavorite,
  useUpdateAlbum,
} from '@/hooks/useApi';
import { Image as ImageType } from '@/types';
import { ImageCard } from '@/components/ImageCard';
import { ImageDetailsModal } from '@/components/ImageDetailsModal';
import { ImageSkeletonGrid } from '@/components/ImageSkeleton';
import { MasonryGrid } from '@/components/MasonryGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/** A user-created album: rename, delete, and remove photos (photos stay in the library). */
export function CustomAlbum() {
  const albumId = Number(useParams<{ id: string }>().id);
  const navigate = useNavigate();
  const { data: album, isLoading, isError } = useAlbum(albumId);
  const updateAlbum = useUpdateAlbum();
  const deleteAlbum = useDeleteAlbum();
  const removeImages = useRemoveImagesFromAlbum();
  const toggleFavorite = useToggleFavorite();

  const [editingName, setEditingName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openImage, setOpenImage] = useState<ImageType | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ImageSkeletonGrid />
      </div>
    );
  }

  if (isError || !album) {
    return (
      <div className="py-24 text-center">
        <p className="mb-4 text-lg">Album not found</p>
        <Button asChild variant="outline">
          <Link to="/albums">Back to albums</Link>
        </Button>
      </div>
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

  const removeFromAlbum = async (imageId: number) => {
    try {
      await removeImages.mutateAsync({ albumId: album.id, imageIds: [imageId] });
      toast.success('Removed from album');
      if (openImage?.id === imageId) setOpenImage(null);
    } catch {
      toast.error('Could not remove the photo');
    }
  };

  const handleDeleteAlbum = async () => {
    try {
      await deleteAlbum.mutateAsync(album.id);
      toast.success(`Deleted “${album.name}”`);
      navigate('/albums');
    } catch {
      toast.error('Could not delete the album');
    }
  };

  const photoCount = `${album.images.length} photo${album.images.length === 1 ? '' : 's'}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/albums">
          <ArrowLeft className="mr-2 h-4 w-4" /> Albums
        </Link>
      </Button>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editingName !== null ? (
            <form onSubmit={saveName} className="flex max-w-md gap-2">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setEditingName(null)}
                maxLength={100}
                autoFocus
              />
              <Button type="submit" disabled={updateAlbum.isPending}>
                Save
              </Button>
            </form>
          ) : (
            <h1 className="truncate text-3xl font-semibold">{album.name}</h1>
          )}
          <p className="mt-1 text-neutral-400">{photoCount}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditingName(album.name)}>
            <Pencil className="h-4 w-4" /> Rename
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-red-500" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete album
          </Button>
        </div>
      </div>

      {album.images.length > 0 ? (
        <MasonryGrid>
          {album.images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onClick={() => setOpenImage(image)}
              onFavoriteToggle={(id) => toggleFavorite.mutate(id)}
              isFavorite={image.is_favorite}
              onDelete={removeFromAlbum}
              deleteLabel="Remove from album"
            />
          ))}
        </MasonryGrid>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-800 py-16 text-center">
          <p className="font-medium">This album is empty</p>
          <p className="mt-1 text-sm text-neutral-500">
            In the <Link to="/" className="underline">gallery</Link>, choose Select, pick photos, then “Add to album”.
          </p>
        </div>
      )}

      <ImageDetailsModal
        image={openImage}
        isOpen={!!openImage}
        onClose={() => setOpenImage(null)}
        onFavoriteToggle={(id) => toggleFavorite.mutate(id)}
        isFavorite={openImage?.is_favorite ?? false}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{album.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Only the album is deleted. Its {album.images.length === 1 ? 'photo stays' : 'photos stay'} in
              your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAlbum} className="bg-red-600 hover:bg-red-700">
              Delete album
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
