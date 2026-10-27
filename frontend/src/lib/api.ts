import { Image, AIQuery, AlbumSummary, Stats, MapMarker } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = {
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  },

  async uploadImage(file: File): Promise<Image> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_BASE_URL}/api/v1/images`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Upload failed: ${response.status}`);
    }

    return response.json();
  },

  async uploadImageWithProgress(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<Image> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      const url = `${API_BASE_URL}/api/v1/images`;

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.detail || `Upload failed: ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Send the request
      xhr.open('POST', url);
      xhr.send(formData);
    });
  },

  images: {
    list: (
      skip: number = 0,
      limit: number = 20,
      sortBy: string = 'upload_date',
      filters: {
        camera?: string;
        location?: string;
        date?: string;
        isFavorite?: boolean;
        status?: string;
      } = {}
    ) => {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
      });
      if (filters.camera) params.append('camera_model', filters.camera);
      if (filters.location) params.append('location', filters.location);
      if (filters.date) params.append('date', filters.date);
      if (filters.isFavorite !== undefined) params.append('is_favorite', filters.isFavorite.toString());
      if (filters.status) params.append('status', filters.status);

      return apiClient.request<Image[]>(`/api/v1/images?${params.toString()}`);
    },

    get: (id: number) =>
      apiClient.request<Image>(`/api/v1/images/${id}`),

    delete: (id: number) =>
      apiClient.request(
        `/api/v1/images/${id}`,
        { method: 'DELETE' }
      ),

    toggleFavorite: (id: number) =>
      apiClient.request<Image>(
        `/api/v1/images/${id}/favorite`,
        { method: 'POST' }
      ),
  },

  albums: {
    summary: () =>
      apiClient.request<AlbumSummary[]>('/api/v1/albums/summary'),

    getImages: (year: number, month: number) =>
      apiClient.request<Image[]>(`/api/v1/albums/${year}/${month}`),

    create: (name: string, description?: string) =>
      apiClient.request<any>('/api/v1/albums/', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }),

    addImages: (albumId: number, imageIds: number[]) =>
      apiClient.request<any>(`/api/v1/albums/${albumId}/images`, {
        method: 'POST',
        body: JSON.stringify(imageIds),
      }),
  },

  search: {
    ai: (query: string) =>
      apiClient.request<Image[]>(
        '/api/v1/search/ai',
        {
          method: 'POST',
          body: JSON.stringify({ query } as AIQuery),
        }
      ),
  },

  filters: {
    cameras: () =>
      apiClient.request<string[]>('/api/v1/filters/cameras'),

    locations: () =>
      apiClient.request<string[]>('/api/v1/filters/locations'),

    dates: () =>
      apiClient.request<string[]>('/api/v1/filters/dates'),
  },

  map: {
    data: () =>
      apiClient.request<MapMarker[]>('/api/v1/map/data'),
  },

  stats: {
    get: () =>
      apiClient.request<Stats>('/api/v1/dashboard-stats'),
  },

  suggestions: {
    albums: () =>
      apiClient.request<string[]>('/api/v1/assist/albums'),

    search: () =>
      apiClient.request<string[]>('/api/v1/assist/search-terms'),
  },

  batch: {
    deleteImages: (imageIds: number[]) =>
      apiClient.request(
        '/api/v1/batch/images/delete',
        { method: 'POST', body: JSON.stringify(imageIds) }
      ),

    toggleFavoriteStatus: (imageIds: number[]) =>
      apiClient.request<Image[]>(
        '/api/v1/batch/images/favorite',
        { method: 'POST', body: JSON.stringify(imageIds) }
      ),
  },

  duplicates: {
    getGroups: () =>
      apiClient.request<Image[][]>('/api/v1/duplicates'),
  },
};
