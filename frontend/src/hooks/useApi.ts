import { useMutation, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

const QUERY_KEYS = {
  images: () => ['images'],
  imagesList: (sortBy: string, filters: Record<string, any>) => ['images', 'list', sortBy, filters],
  imagesFavorites: () => ['images', 'favorites'],
  search: (query: string) => ['search', query],
  albums: () => ['albums'],
  albumSummary: () => ['albums', 'summary'],
  albumImages: (year: number, month: number) => ['albums', year, month],
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
  return useMutation({
    mutationFn: (id: number) => apiClient.images.toggleFavorite(id),
  });
};

export const useSearch = (query: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: QUERY_KEYS.search(query),
    queryFn: () => apiClient.search.query(query),
    enabled: enabled && query.length > 0,
  });
};

export const useAlbumSummary = () => {
  return useQuery({
    queryKey: QUERY_KEYS.albumSummary(),
    queryFn: () => apiClient.albums.summary(),
  });
};

export const useAlbumImages = (year: number, month: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.albumImages(year, month),
    queryFn: () => apiClient.albums.getImages(year, month),
  });
};

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

export const useCreateAlbum = () => {
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      apiClient.albums.create(name, description),
  });
};

export const useAddImagesToAlbum = () => {
  return useMutation({
    mutationFn: ({ albumId, imageIds }: { albumId: number; imageIds: number[] }) =>
      apiClient.albums.addImages(albumId, imageIds),
  });
};

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
