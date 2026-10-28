import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ImageOff } from 'lucide-react';
import { useDeleteImage, useDemoMode, useImage, useToggleFavorite } from '@/hooks/useApi';
import { EmptyState, Page } from '@/components/Page';
import { PhotoViewer } from '@/components/PhotoViewer';

/** /image/:id: a shareable link that opens one photo in the viewer (used by the map). */
export function ImageDetail() {
  const id = Number(useParams<{ id: string }>().id);
  const navigate = useNavigate();
  const { data: image, isLoading } = useImage(id);
  const favorite = useToggleFavorite();
  const remove = useDeleteImage();
  const demo = useDemoMode();
  const close = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (isLoading) return null;
  if (!image) {
    return (
      <Page>
        <EmptyState icon={ImageOff} title="Photo not found" />
      </Page>
    );
  }

  return (
    <PhotoViewer
      images={[image]}
      index={0}
      onIndexChange={() => {}}
      onClose={close}
      onToggleFavorite={demo ? undefined : (photoId) => favorite.mutate(photoId)}
      canAddToAlbum={!demo}
      onDelete={
        demo
          ? undefined
          : async (photoId) => {
              await remove.mutateAsync(photoId);
              toast.success('Photo deleted');
              navigate('/');
            }
      }
    />
  );
}
