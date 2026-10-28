import { Heart } from 'lucide-react';
import { useImages } from '@/hooks/useApi';
import { EmptyState, GridSkeleton, Page } from '@/components/Page';
import { PhotoBrowser } from '@/components/PhotoBrowser';

export function Favorites() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useImages('date_taken', {
    isFavorite: true,
  });
  const images = data?.pages.flat() ?? [];

  return (
    <Page title="Favorites">
      {isLoading ? (
        <GridSkeleton />
      ) : images.length === 0 ? (
        <EmptyState icon={Heart} title="No favorites yet">
          Hover a photo and tap the heart, or press it in the photo viewer.
        </EmptyState>
      ) : (
        <PhotoBrowser
          images={images}
          byDay
          loadMore={hasNextPage ? () => fetchNextPage() : undefined}
          loadingMore={isFetchingNextPage}
        />
      )}
    </Page>
  );
}
