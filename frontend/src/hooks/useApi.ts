/**
 * React Query hooks for every API call.
 *
 * Reads are cached by key. Every write refreshes all cached reads afterwards:
 * a favorite or delete can change the gallery, an album, search results, the
 * map and stats at once, and for a personal library refetching is cheap.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Issue } from '@/types';

export interface ImageFilters {
  camera?: string;
  location?: string;
  date?: string;
  isFavorite?: boolean;
  status?: string;
  issue?: Issue;
}

const PAGE_SIZE = 60;

// --- Reads --------------------------------------------------------------------

export const useImages = (sortBy = 'upload_date', filters: ImageFilters = {}) =>
  useInfiniteQuery({
    queryKey: ['images', 'list', sortBy, filters],
    queryFn: ({ pageParam }) => apiClient.images.list(pageParam, PAGE_SIZE, sortBy, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
  });

export const useImage = (id: number) =>
  useQuery({
    queryKey: ['images', 'detail', id],
    queryFn: () => apiClient.images.get(id),
    enabled: Number.isFinite(id),
  });

export const useSearch = (query: string) =>
  useQuery({
    queryKey: ['search', query],
    queryFn: () => apiClient.search.query(query),
    enabled: query.trim().length > 0,
  });

export const useMonthAlbums = () =>
  useQuery({ queryKey: ['albums', 'months'], queryFn: () => apiClient.albums.months() });

export const useMonthImages = (year: number, month: number) =>
  useQuery({
    queryKey: ['albums', 'months', year, month],
    queryFn: () => apiClient.albums.monthImages(year, month),
  });

export const useAlbums = () =>
  useQuery({ queryKey: ['albums', 'list'], queryFn: () => apiClient.albums.list() });

export const useAlbum = (id: number) =>
  useQuery({
    queryKey: ['albums', 'detail', id],
    queryFn: () => apiClient.albums.get(id),
    enabled: Number.isFinite(id),
  });

export const useCameraFilters = () =>
  useQuery({ queryKey: ['filters', 'cameras'], queryFn: () => apiClient.filters.cameras() });

export const useLocationFilters = () =>
  useQuery({ queryKey: ['filters', 'locations'], queryFn: () => apiClient.filters.locations() });

export const useDateFilters = () =>
  useQuery({ queryKey: ['filters', 'dates'], queryFn: () => apiClient.filters.dates() });

export const useMapData = () =>
  useQuery({ queryKey: ['map'], queryFn: () => apiClient.map.data() });

export const useLibraryHealth = () =>
  useQuery({ queryKey: ['library'], queryFn: () => apiClient.library.health() });

export const useDuplicateImageGroups = () =>
  useQuery({ queryKey: ['duplicates'], queryFn: () => apiClient.duplicates.getGroups() });

/** True on the public demo: uploads and photo deletes are switched off server-side. */
export const useDemoMode = () =>
  useQuery({ queryKey: ['config'], queryFn: () => apiClient.config(), staleTime: Infinity }).data
    ?.demo_mode ?? false;

// --- Writes -------------------------------------------------------------------

function useWrite<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries() });
}

export const useToggleFavorite = () => useWrite((id: number) => apiClient.images.toggleFavorite(id));

export const useReindex = () => useWrite((issue: Issue) => apiClient.library.reindex(issue));

export const useDeleteImage = () => useWrite((id: number) => apiClient.images.delete(id));

export const useBatchDeleteImages = () =>
  useWrite((ids: number[]) => apiClient.batch.deleteImages(ids));

export const useBatchToggleFavoriteStatus = () =>
  useWrite((ids: number[]) => apiClient.batch.toggleFavoriteStatus(ids));

export const useCreateAlbum = () =>
  useWrite(({ name, description }: { name: string; description?: string }) =>
    apiClient.albums.create(name, description)
  );

export const useUpdateAlbum = () =>
  useWrite(({ id, ...changes }: { id: number; name?: string; description?: string | null }) =>
    apiClient.albums.update(id, changes)
  );

export const useDeleteAlbum = () => useWrite((id: number) => apiClient.albums.remove(id));

export const useAddImagesToAlbum = () =>
  useWrite(({ albumId, imageIds }: { albumId: number; imageIds: number[] }) =>
    apiClient.albums.addImages(albumId, imageIds)
  );

export const useRemoveImagesFromAlbum = () =>
  useWrite(({ albumId, imageIds }: { albumId: number; imageIds: number[] }) =>
    apiClient.albums.removeImages(albumId, imageIds)
  );
