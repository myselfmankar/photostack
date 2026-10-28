import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Images } from 'lucide-react';
import { useMonthImages } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { EmptyState, GridSkeleton, Page } from '@/components/Page';
import { PhotoBrowser } from '@/components/PhotoBrowser';

/** An automatic month album: /albums/2025/11 */
export function AlbumDetail() {
  const params = useParams<{ year: string; month: string }>();
  const year = Number(params.year);
  const month = Number(params.month);
  const { data: images = [], isLoading } = useMonthImages(year, month);
  const title = new Date(year, month - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Page
      title={
        <span className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="-ml-2 rounded-full">
            <Link to="/albums" aria-label="Back to albums">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          {title}
        </span>
      }
      subtitle={!isLoading && `${images.length} photo${images.length === 1 ? '' : 's'}`}
    >
      {isLoading ? (
        <GridSkeleton />
      ) : images.length === 0 ? (
        <EmptyState icon={Images} title="No photos from this month" />
      ) : (
        <PhotoBrowser images={images} byDay />
      )}
    </Page>
  );
}
