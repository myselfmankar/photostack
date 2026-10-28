import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

const QUERY_KEYS = {
  images: () => ['images'],
  imagesList: (sortBy: string, filters: Record<string, any>) => ['images', 'list', sortBy, filters],
  imagesFavorites: () => ['images', 'favorites'],
  search: (query: string) => ['search', query],
  albums: () => ['albums'],
  albumList: () => ['albums', 'list'],
  album: (id: number) => ['albums', 'detail', id],
  months: () => ['albums', 'months'],
  monthImages: (year: number, month: number) => ['albums', 'months', year, month],
  filters: () => ['filters'],
  cameras: () => ['filters', 'cameras'],
  locations: () => ['filters', 'locations'],
  dates: () => ['filters', 'dates'],
  map: () => ['map', 'data'],
  stats: () => ['stats'],
  image: (id: number) => ['image', id],
  duplicates: () => ['duplicates'],
};

export const useImages = (
  sortBy: string = 'upload_date',
  filters: {
    camera?: string;
    location?: string;
    date?: string;
    isFavorite?: boolean;
    status?: string;
  } = {},
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.imagesList(sortBy, filters),
    queryFn: ({ pageParam = 0 }) =>
      apiClient.images.list(pageParam, 20, sortBy, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    enabled,
  });
};

export const useImage = (id: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.image(id),
    queryFn: () => apiClient.images.get(id),
    enabled: !!id,
  });
};

export const useUploadImage = () => {
  return useMutation({
    mutationFn: (file: File) => apiClient.uploadImage(file),
  });
};

export const useDeleteImage = () => {
  return useMutation({
    mutationFn: (id: number) => apiClient.images.delete(id),
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.images.toggleFavorite(id),
    // Album pages read photos from the album query, so refresh it too.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.albums() }),
  });
};

export const useSearch = (query: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: QUERY_KEYS.search(query),
    queryFn: () => apiClient.search.query(query),
    enabled: enabled && query.length > 0,
  });
};

export const useMonthAlbums = () =>
  useQuery({ queryKey: QUERY_KEYS.months(), queryFn: () => apiClient.albums.months() });

export const useMonthImages = (year: number, month: number) =>
  useQuery({
    queryKey: QUERY_KEYS.monthImages(year, month),
    queryFn: () => apiClient.albums.monthImages(year, month),
  });

export const useAlbums = () =>
  useQuery({ queryKey: QUERY_KEYS.albumList(), queryFn: () => apiClient.albums.list() });

export const useAlbum = (id: number) =>
  useQuery({
    queryKey: QUERY_KEYS.album(id),
    queryFn: () => apiClient.albums.get(id),
    enabled: Number.isFinite(id),
  });

export const useCameraFilters = () => {
  return useQuery({
    queryKey: QUERY_KEYS.cameras(),
    queryFn: () => apiClient.filters.cameras(),
  });
};

export const useLocationFilters = () => {
  return useQuery({
    queryKey: QUERY_KEYS.locations(),
    queryFn: () => apiClient.filters.locations(),
  });
};

export const useDateFilters = () => {
  return useQuery({
    queryKey: QUERY_KEYS.dates(),
    queryFn: () => apiClient.filters.dates(),
  });
};

export const useMapData = () => {
  return useQuery({
    queryKey: QUERY_KEYS.map(),
    queryFn: () => apiClient.map.data(),
  });
};

export const useStats = () => {
  return useQuery({
    queryKey: QUERY_KEYS.stats(),
    queryFn: () => apiClient.stats.get(),
  });
};

/** Album changes also change photos' album lists, so refresh both. */
const useAlbumMutation = <TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.albums() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.images() });
    },
  });
};

export const useCreateAlbum = () =>
  useAlbumMutation(({ name, description }: { name: string; description?: string }) =>
    apiClient.albums.create(name, description)
  );

export const useUpdateAlbum = () =>
  useAlbumMutation(({ id, ...changes }: { id: number; name?: string; description?: string | null }) =>
    apiClient.albums.update(id, changes)
  );

export const useDeleteAlbum = () => useAlbumMutation((id: number) => apiClient.albums.remove(id));

export const useAddImagesToAlbum = () =>
  useAlbumMutation(({ albumId, imageIds }: { albumId: number; imageIds: number[] }) =>
    apiClient.albums.addImages(albumId, imageIds)
  );

export const useRemoveImagesFromAlbum = () =>
  useAlbumMutation(({ albumId, imageIds }: { albumId: number; imageIds: number[] }) =>
    apiClient.albums.removeImages(albumId, imageIds)
  );

export const useBatchDeleteImages = () => {
  return useMutation({
    mutationFn: (imageIds: number[]) => apiClient.batch.deleteImages(imageIds),
  });
};

export const useBatchToggleFavoriteStatus = () => {
  return useMutation({
    mutationFn: (imageIds: number[]) => apiClient.batch.toggleFavoriteStatus(imageIds),
  });
};

export const useDuplicateImageGroups = () => {
  return useQuery({
    queryKey: QUERY_KEYS.duplicates(),
    queryFn: () => apiClient.duplicates.getGroups(),
  });
};
