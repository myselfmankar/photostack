import { useCallback, useState, useMemo, useEffect } from 'react';
import { useImages, useToggleFavorite, useDeleteImage, useBatchDeleteImages, useBatchToggleFavoriteStatus } from '@/hooks/useApi';
import { ImageCard } from '@/components/ImageCard';

import { ImageSkeletonGrid } from '@/components/ImageSkeleton';
import { ImageDetailsModal } from '@/components/ImageDetailsModal';
import { FilterPanel, FilterState } from '@/components/FilterPanel';
import { Image as ImageType } from '@/types';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Grid3x3, List, SlidersHorizontal, SquareStack, Heart, Trash2, CheckSquare, FolderPlus } from 'lucide-react';
import { AddToAlbumDialog } from '@/components/AddToAlbumDialog';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/query-client';

export function Gallery() {
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);
  const [favoriteOptimistic, setFavoriteOptimistic] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [filters, setFilters] = useState<FilterState>({
    sortBy: 'upload_date',
  });

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [showAddToAlbum, setShowAddToAlbum] = useState(false);

  const { toast } = useToast();

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useImages(filters.sortBy, {
    camera: filters.camera,
    location: filters.location,
    date: filters.date,
    isFavorite: filters.isFavorite,
    status: filters.status,
  });

  const deleteMutation = useDeleteImage();
  const favoriteMutation = useToggleFavorite();
  const batchDeleteMutation = useBatchDeleteImages();
  const batchFavoriteMutation = useBatchToggleFavoriteStatus();

  const images = useMemo(() => {
    return data?.pages.flatMap((page) => page) || [];
  }, [data]);

  // Handle scroll for infinite loading
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDelete = useCallback(async () => {
    if (!imageToDelete) return;

    try {
      await deleteMutation.mutateAsync(imageToDelete);
      toast({ description: 'Image deleted successfully' });
      setImageToDelete(null);
      if (selectedImage?.id === imageToDelete) {
        setSelectedImage(null);
      }
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['images'] });
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
        queryClient.invalidateQueries({ queryKey: ['images'] });
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

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ sortBy: 'upload_date' });
  }, []);

  // Multi-select handlers
  const handleImageSelect = useCallback((id: number, isSelected: boolean) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map((img) => img.id)));
    }
  }, [images, selectedImages]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedImages.size === 0) return;

    try {
      await batchDeleteMutation.mutateAsync(Array.from(selectedImages));
      toast({
        description: `Successfully deleted ${selectedImages.size} image${selectedImages.size > 1 ? 's' : ''}`
      });
      setSelectedImages(new Set());
      setSelectionMode(false);
      setShowBatchDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['images'] });
    } catch (error) {
      toast({
        description: 'Failed to delete images',
        variant: 'destructive',
      });
    }
  }, [selectedImages, batchDeleteMutation, toast]);

  const handleBatchFavorite = useCallback(async () => {
    if (selectedImages.size === 0) return;

    try {
      await batchFavoriteMutation.mutateAsync(Array.from(selectedImages));
      toast({
        description: `Updated ${selectedImages.size} image${selectedImages.size > 1 ? 's' : ''}`
      });
      setSelectedImages(new Set());
      setSelectionMode(false);
      queryClient.invalidateQueries({ queryKey: ['images'] });
    } catch (error) {
      toast({
        description: 'Failed to update favorites',
        variant: 'destructive',
      });
    }
  }, [selectedImages, batchFavoriteMutation, toast]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    setSelectedImages(new Set());
  }, []);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-500 mb-2">Error loading images</h2>
          <p className="text-neutral-400 mb-4">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Gallery</h1>
            <p className="text-neutral-400 mt-1">
              {images.length} image{images.length !== 1 ? 's' : ''}
              {selectedImages.size > 0 && ` • ${selectedImages.size} selected`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
                title="Grid View"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
                title="List View"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'compact' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('compact')}
                className="h-8 w-8 p-0"
                title="Compact View"
              >
                <SquareStack className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>

            {/* Selection Mode Toggle */}
            <Button
              variant={selectionMode ? 'default' : 'outline'}
              onClick={toggleSelectionMode}
              className="gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              {selectionMode ? 'Cancel' : 'Select'}
            </Button>
          </div>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectionMode && (
        <div className="mb-6 p-4 bg-blue-950/20 border border-blue-800 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedImages.size === images.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-neutral-400">
                {selectedImages.size} of {images.length} selected
              </span>
            </div>

            {selectedImages.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchFavorite}
                  disabled={batchFavoriteMutation.isPending}
                  className="gap-2"
                >
                  <Heart className="h-4 w-4" />
                  Toggle Favorites
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddToAlbum(true)}
                  className="gap-2"
                >
                  <FolderPlus className="h-4 w-4" />
                  Add to album
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBatchDeleteDialog(true)}
                  disabled={batchDeleteMutation.isPending}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6">
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        </div>
      )}

      {/* Images Grid */}
      {isLoading ? (
        <ImageSkeletonGrid />
      ) : images.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 rounded-lg border border-neutral-800">
          <h2 className="text-xl font-semibold mb-2">No images found</h2>
          <p className="text-neutral-500 mb-6">
            {filters.camera || filters.location || filters.date || filters.isFavorite || filters.status
              ? 'Try adjusting your filters or upload some images to get started.'
              : 'Upload some images to get started.'}
          </p>
          {(filters.camera || filters.location || filters.date || filters.isFavorite || filters.status) && (
            <Button onClick={handleClearFilters}>Clear Filters</Button>
          )}
        </div>
      ) : (
        <>
          <div
            className={
              viewMode === 'compact'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
                : viewMode === 'list'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4'
            }
          >
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onClick={() => !selectionMode && setSelectedImage(image)}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={(id) => setImageToDelete(id)}
                isFavorite={image.is_favorite || favoriteOptimistic.has(image.id)}
                selectable={selectionMode}
                isSelected={selectedImages.has(image.id)}
                onSelect={handleImageSelect}
                className="break-inside-avoid"
              />
            ))}
          </div>

          {/* Load More Indicator */}
          {isFetchingNextPage && (
            <div className="mt-8">
              <ImageSkeletonGrid count={4} />
            </div>
          )}

          {!hasNextPage && images.length > 0 && (
            <div className="text-center py-8 text-neutral-500">
              You've reached the end
            </div>
          )}
        </>
      )}

      {/* Image Details Modal */}
      <ImageDetailsModal
        image={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        onFavoriteToggle={handleFavoriteToggle}
        onDelete={(id) => setImageToDelete(id)}
        isFavorite={selectedImage ? selectedImage.is_favorite || favoriteOptimistic.has(selectedImage.id) : false}
      />

      {/* Single Delete Dialog */}
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
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AddToAlbumDialog
        imageIds={Array.from(selectedImages)}
        open={showAddToAlbum}
        onOpenChange={setShowAddToAlbum}
        onDone={() => {
          setSelectedImages(new Set());
          setSelectionMode(false);
        }}
      />

      {/* Batch Delete Dialog */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent className="bg-neutral-900 border-neutral-800">
          <AlertDialogTitle>Delete {selectedImages.size} images</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {selectedImages.size} selected image{selectedImages.size > 1 ? 's' : ''}?
            This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="bg-neutral-800 hover:bg-neutral-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {batchDeleteMutation.isPending ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
