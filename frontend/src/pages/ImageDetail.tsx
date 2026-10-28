import { useParams, useNavigate } from 'react-router-dom';
import { useImage, useToggleFavorite, useDeleteImage, useSearch } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Download, Trash2, ArrowLeft, MapPin, Camera, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ImageCard } from '@/components/ImageCard';
import { MasonryGrid } from '@/components/MasonryGrid';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function ImageDetail() {
    const { id } = useParams<{ id: string }>();
    const imageId = Number(id);
    const navigate = useNavigate();
    const { toast } = useToast();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const { data: image, isLoading } = useImage(imageId);
    const deleteMutation = useDeleteImage();
    const favoriteMutation = useToggleFavorite();

    // Related photos: others sharing this photo's first tag
    const firstTag = image?.tags[0]?.name ?? '';
    const { data: relatedImages } = useSearch(firstTag, !!firstTag);

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(imageId);
            toast({ description: 'Image deleted successfully' });
            navigate('/');
        } catch (error) {
            toast({ description: 'Failed to delete image', variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-screen">
                <Skeleton className="h-full w-full bg-neutral-800 rounded-lg" />
            </div>
        );
    }

    if (!image) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
                <h1 className="text-2xl font-bold mb-4">Image not found</h1>
                <Button onClick={() => navigate('/')}>Back to Gallery</Button>
            </div>
        );
    }

    const largeUrl = image.full_url;

    return (
        <div className="min-h-screen bg-neutral-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Image Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-neutral-800">
                            <img
                                src={largeUrl}
                                alt={image.filename}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>

                        {/* Related Images */}
                        {relatedImages && relatedImages.length > 1 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Related Images</h3>
                                <MasonryGrid>
                                    {relatedImages
                                        .filter(img => img.id !== imageId)
                                        .slice(0, 4)
                                        .map(img => (
                                            <ImageCard
                                                key={img.id}
                                                image={img}
                                                onClick={() => navigate(`/image/${img.id}`)}
                                            />
                                        ))}
                                </MasonryGrid>
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Metadata */}
                    <div className="space-y-6">
                        <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800 space-y-6">
                            <div>
                                <h1 className="text-xl font-semibold break-all">{image.filename}</h1>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Uploaded {format(parseISO(image.upload_date), 'MMM d, yyyy')}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => favoriteMutation.mutateAsync(imageId)}
                                >
                                    <Heart className={cn("h-4 w-4 mr-2", image.is_favorite && "fill-red-500 text-red-500")} />
                                    Favorite
                                </Button>
                                <Button variant="outline" className="flex-1" asChild>
                                    <a href={largeUrl} download={image.filename}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                    </a>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => setDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* EXIF Data */}
                            <div className="space-y-4">
                                <h3 className="font-medium flex items-center gap-2">
                                    <Camera className="h-4 w-4" />
                                    Camera Info
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-neutral-500">Model</p>
                                        <p>{image.camera_model || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Lens</p>
                                        <p>{image.lens_model || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Aperture</p>
                                        <p>{image.f_number ? `f/${image.f_number}` : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">ISO</p>
                                        <p>{image.iso || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Shutter</p>
                                        <p>{image.exposure_time || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Focal Length</p>
                                        <p>{image.focal_length || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            {image.latitude != null && image.longitude != null && (
                                <div className="space-y-4 pt-4 border-t border-neutral-800">
                                    <h3 className="font-medium flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Location
                                    </h3>
                                    <p className="text-sm">{image.address || 'Looking up address…'}</p>
                                    <div className="text-xs text-neutral-500 font-mono">
                                        {image.latitude.toFixed(6)}, {image.longitude.toFixed(6)}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {image.tags.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-neutral-800">
                                    <h3 className="font-medium flex items-center gap-2">
                                        <Info className="h-4 w-4" />
                                        Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {image.tags.map(tag => (
                                            <Badge key={tag.id} variant="secondary">
                                                {tag.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-neutral-900 border-neutral-800">
                    <AlertDialogTitle>Delete Image</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this image? This action cannot be undone.
                    </AlertDialogDescription>
                    <div className="flex justify-end gap-3">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
