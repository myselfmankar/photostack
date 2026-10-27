import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch, useToggleFavorite, useDeleteImage } from '@/hooks/useApi';
import { ImageCard } from '@/components/ImageCard';
import { MasonryGrid } from '@/components/MasonryGrid';
import { ImageSkeletonGrid } from '@/components/ImageSkeleton';
import { ImageDetailsModal } from '@/components/ImageDetailsModal';
import { Image as ImageType } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function Search() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);
  const [favoriteOptimistic, setFavoriteOptimistic] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Auto-trigger search from URL parameter
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
      setSearchQuery(urlQuery);
    }
  }, [searchParams]);

  const { data: results, isLoading, isFetching } = useSearch(
    searchQuery,
    searchQuery.length > 0
  );

  const deleteMutation = useDeleteImage();
  const favoriteMutation = useToggleFavorite();

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchQuery(query.trim());
    }
  }, [query]);

  const handleDelete = useCallback(async () => {
    if (!imageToDelete) return;

    try {
      await deleteMutation.mutateAsync(imageToDelete);
      toast({ description: 'Image deleted successfully' });
      setImageToDelete(null);
      if (selectedImage?.id === imageToDelete) {
        setSelectedImage(null);
      }
    } catch (error) {
      toast({
        description: 'Failed to delete image',
        variant: 'destructive',
      });
    }
  }, [imageToDelete, deleteMutation, selectedImage, toast]);

  const handleFavoriteToggle = useCallback(
    async (id: number) => {
      const newFavorites = new Set(favoriteOptimistic);
      const wasFavorite = newFavorites.has(id);

      if (wasFavorite) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      setFavoriteOptimistic(newFavorites);

      try {
        await favoriteMutation.mutateAsync(id);
      } catch (error) {
        const revertFavorites = new Set(favoriteOptimistic);
        if (wasFavorite) {
          revertFavorites.add(id);
        } else {
          revertFavorites.delete(id);
        }
        setFavoriteOptimistic(revertFavorites);
        toast({
          description: 'Failed to update favorite',
          variant: 'destructive',
        });
      }
    },
    [favoriteMutation, favoriteOptimistic, toast]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-6">Search Images</h1>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Describe what you're looking for... (e.g., 'sunset over mountains', 'people at the beach')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-neutral-900 border-neutral-800"
          />
          <Button type="submit" disabled={isLoading || isFetching || !query.trim()}>
            {isFetching && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Search
          </Button>
        </form>
      </div>

      {searchQuery && (
        <div className="mb-4">
          <p className="text-sm text-neutral-400">
            Results for: <span className="text-neutral-300 font-medium">"{searchQuery}"</span>
          </p>
        </div>
      )}

      {isLoading || isFetching ? (
        <ImageSkeletonGrid />
      ) : results && results.length > 0 ? (
        <>
          <MasonryGrid>
            {results.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onClick={() => setSelectedImage(image)}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={(id) => setImageToDelete(id)}
                isFavorite={favoriteOptimistic.has(image.id) || image.is_favorite}
              />
            ))}
          </MasonryGrid>

          <p className="text-sm text-neutral-400 mt-6">
            Found {results.length} image{results.length !== 1 ? 's' : ''}
          </p>
        </>
      ) : searchQuery ? (
        <div className="text-center py-12">
          <p className="text-neutral-500">No images found for your search</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-neutral-500">Enter a search query to get started</p>
        </div>
      )}

      <ImageDetailsModal
        image={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        onFavoriteToggle={handleFavoriteToggle}
        onDelete={(id) => setImageToDelete(id)}
        isFavorite={
          selectedImage
            ? favoriteOptimistic.has(selectedImage.id) || selectedImage.is_favorite
            : false
        }
      />

      <AlertDialog open={!!imageToDelete} onOpenChange={() => setImageToDelete(null)}>
        <AlertDialogContent className="bg-neutral-900 border-neutral-800">
          <AlertDialogTitle>Delete image</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this image? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="bg-neutral-800 hover:bg-neutral-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
