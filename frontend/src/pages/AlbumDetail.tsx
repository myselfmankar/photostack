import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useToggleFavorite, useDeleteImage } from '@/hooks/useApi';
import { Image as ImageType } from '@/types';
import { ImageCard } from '@/components/ImageCard';
import { MasonryGrid } from '@/components/MasonryGrid';
import { ImageSkeletonGrid } from '@/components/ImageSkeleton';
import { ImageDetailsModal } from '@/components/ImageDetailsModal';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar } from 'lucide-react';

export function AlbumDetail() {
    const { year, month } = useParams<{ year: string; month: string }>();
    const navigate = useNavigate();
    const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);
    const [imageToDelete, setImageToDelete] = useState<number | null>(null);
    const [favoriteOptimistic, setFavoriteOptimistic] = useState<Set<number>>(new Set());
    const { toast } = useToast();

    const { data: images, isLoading } = useQuery<ImageType[]>({
        queryKey: ['albums', year, month],
        queryFn: () => apiClient.albums.monthImages(Number(year), Number(month)),
        enabled: !!year && !!month,
    });

    const deleteMutation = useDeleteImage();
    const favoriteMutation = useToggleFavorite();

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

    const getMonthName = (monthNum: string) => {
        return new Date(2000, Number(monthNum) - 1).toLocaleDateString('en-US', { month: 'long' });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/albums')}
                    className="mb-4 -ml-2"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Albums
                </Button>

                <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-8 w-8 text-blue-500" />
                    <h1 className="text-3xl font-semibold">
                        {month && year && `${getMonthName(month)} ${year}`}
                    </h1>
                </div>
                <p className="text-neutral-400">
                    {images?.length || 0} photo{images?.length !== 1 ? 's' : ''}
                </p>
            </div>

            {isLoading ? (
                <ImageSkeletonGrid />
            ) : images && images.length > 0 ? (
                <MasonryGrid>
                    {images.map((image) => (
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
            ) : (
                <div className="text-center py-12">
                    <p className="text-neutral-500">No photos in this album</p>
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
