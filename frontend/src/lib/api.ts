import { Album, AlbumSummary, Image, Issue, LibraryHealth, MapMarker, MonthAlbum } from '@/types';

// Same origin by default: in production FastAPI serves this app and the API together,
// and in `npm run dev` Vite proxies /api and /uploads to the backend (vite.config.ts).
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

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
        issue?: Issue;
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
      if (filters.issue) params.append('issue', filters.issue);

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
    months: () => apiClient.request<MonthAlbum[]>('/api/v1/albums/months'),

    monthImages: (year: number, month: number) =>
      apiClient.request<Image[]>(`/api/v1/albums/months/${year}/${month}`),

    list: () => apiClient.request<AlbumSummary[]>('/api/v1/albums'),

    get: (id: number) => apiClient.request<Album>(`/api/v1/albums/${id}`),

    create: (name: string, description?: string) =>
      apiClient.request<Album>('/api/v1/albums', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }),

    update: (id: number, changes: { name?: string; description?: string | null }) =>
      apiClient.request<Album>(`/api/v1/albums/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),

    remove: (id: number) =>
      apiClient.request<void>(`/api/v1/albums/${id}`, { method: 'DELETE' }),

    addImages: (id: number, imageIds: number[]) =>
      apiClient.request<Album>(`/api/v1/albums/${id}/images`, {
        method: 'POST',
        body: JSON.stringify(imageIds),
      }),

    removeImages: (id: number, imageIds: number[]) =>
      apiClient.request<Album>(`/api/v1/albums/${id}/images/remove`, {
        method: 'POST',
        body: JSON.stringify(imageIds),
      }),
  },

  search: {
    query: (q: string) =>
      apiClient.request<Image[]>(`/api/v1/search?q=${encodeURIComponent(q)}`),
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

  library: {
    health: () => apiClient.request<LibraryHealth>('/api/v1/library'),

    reindex: (issue: Issue) =>
      apiClient.request<{ queued: number }>(`/api/v1/library/reindex?issue=${issue}`, { method: 'POST' }),
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

  config: () => apiClient.request<{ demo_mode: boolean }>('/api/v1/config'),

  duplicates: {
    getGroups: () =>
      apiClient.request<Image[][]>('/api/v1/duplicates'),
  },
};
