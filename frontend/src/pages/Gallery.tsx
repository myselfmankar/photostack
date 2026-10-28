import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImagePlus } from 'lucide-react';
import { useImages } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { EmptyState, GridSkeleton, Page } from '@/components/Page';
import { FilterPanel, FilterState } from '@/components/FilterPanel';
import { PhotoBrowser } from '@/components/PhotoBrowser';

/** The home page: every photo as a timeline, newest first. */
export function Gallery() {
  const [filters, setFilters] = useState<FilterState>({ sortBy: 'date_taken' });
  const { sortBy, ...where } = filters;
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useImages(sortBy, where);
  const images = data?.pages.flat() ?? [];
  const filtered = Boolean(where.camera || where.location || where.date);

  return (
    <Page title="Photos" actions={images.length > 0 || filtered ? <FilterPanel filters={filters} onChange={setFilters} /> : null}>
      {isLoading ? (
        <GridSkeleton />
      ) : isError ? (
        <EmptyState icon={ImagePlus} title="Couldn't load photos">
          Is the server running? Try reloading the page.
        </EmptyState>
      ) : images.length === 0 ? (
        filtered ? (
          <EmptyState icon={ImagePlus} title="No photos match these filters" />
        ) : (
          <EmptyState icon={ImagePlus} title="Your library is empty">
            <p>Upload photos and PhotoStack will read their dates, places and cameras for you.</p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/upload">Upload photos</Link>
            </Button>
          </EmptyState>
        )
      ) : (
        <PhotoBrowser
          images={images}
          byDay={sortBy.startsWith('date_taken') || sortBy === 'upload_date'}
          loadMore={hasNextPage ? () => fetchNextPage() : undefined}
          loadingMore={isFetchingNextPage}
        />
      )}
    </Page>
  );
}
