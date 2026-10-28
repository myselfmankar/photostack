import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { useImages } from '@/hooks/useApi';
import { Issue } from '@/types';
import { Button } from '@/components/ui/button';
import { EmptyState, GridSkeleton, Page } from '@/components/Page';
import { PhotoBrowser } from '@/components/PhotoBrowser';

const TITLES: Record<Issue, string> = {
  failed: "Files that couldn't be read",
  video_no_thumbnail: 'Videos without a thumbnail',
  no_date: 'Photos without a date',
  no_location: 'Photos without a location',
  flagged: 'Flagged by integrity checks',
};

/** The photos behind one "needs attention" row: /library/no_location */
export function LibraryIssue() {
  const issue = useParams<{ issue: Issue }>().issue!;
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useImages('upload_date', { issue });
  const images = data?.pages.flat() ?? [];

  return (
    <Page
      title={
        <span className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="-ml-2 rounded-full">
            <Link to="/library" aria-label="Back to library">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          {TITLES[issue] ?? 'Photos'}
        </span>
      }
    >
      {isLoading ? (
        <GridSkeleton />
      ) : images.length === 0 ? (
        <EmptyState icon={CircleCheck} title="All fixed" />
      ) : (
        <PhotoBrowser
          images={images}
          loadMore={hasNextPage ? () => fetchNextPage() : undefined}
          loadingMore={isFetchingNextPage}
        />
      )}
    </Page>
  );
}
