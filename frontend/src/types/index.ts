export interface Location {
  id: number;
  latitude: number;
  longitude: number;
  address?: string | null;
}

export interface Metadata {
  id: number;
  camera_model?: string | null;
  date_taken?: string | null;
  f_number?: number | null;
  exposure_time?: string | null;
  iso?: number | null;
  focal_length?: string | null;
  lens_model?: string | null;
  raw_exif?: Record<string, unknown> | null;
  location?: Location | null;
}

export interface Tag {
  id: number;
  name: string;
}

export interface AlbumBase {
  name: string;
  description?: string | null;
}

export interface Image {
  id: number;
  filename: string;
  filepath: string;
  upload_date: string;
  resolution: string;
  image_size: number;
  mimetype?: string | null;
  details?: Metadata | null;
  tags: Tag[];
  albums: AlbumBase[];
  is_favorite: boolean;
  thumbnail_url?: string | null;
  medium_url?: string | null;
  large_url?: string | null;
  status: 'processing' | 'ready' | 'error';
}


export interface AlbumSummary {
  year: number;
  month: number;
  image_count: number;
  preview_image_url?: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  thumbnail_url?: string | null;
  filename: string;
}

export interface Stats {
  total_images: number;
  total_size: number;
  favorites_count: number;
  camera_stats: { name: string; value: number }[];
  location_stats: { name: string; value: number }[];
  processing_status: Record<string, number>;
  uploads_by_month: { month: string; count: number }[];
}
