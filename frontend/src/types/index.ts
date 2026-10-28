export interface Tag {
  id: number;
  name: string;
}

export interface AlbumRef {
  id: number;
  name: string;
  description?: string | null;
}

export type ImageStatus = 'processing' | 'completed' | 'failed';

export interface Image {
  id: number;
  filename: string;
  upload_date: string;
  status: ImageStatus;
  is_favorite: boolean;

  width: number | null;
  height: number | null;
  image_size: number | null;

  date_taken: string | null;
  camera_model: string | null;
  lens_model: string | null;
  f_number: number | null;
  exposure_time: string | null;
  iso: number | null;
  focal_length: string | null;

  latitude: number | null;
  longitude: number | null;
  address: string | null;

  /** Integrity checks (see photostack/integrity.py). */
  sha256: string | null;
  edited_with: string | null;
  trailing_bytes: number | null;

  tags: Tag[];
  albums: AlbumRef[];
  thumbnail_url: string;
  /** Full-size image the browser can display (WebP preview for HEIC). */
  full_url: string;
}

/** An automatic month album (photos grouped by date taken). */
export interface MonthAlbum {
  year: number;
  month: number;
  month_name: string;
  image_count: number;
  preview_image_url: string;
}

/** A user-created album, as shown in the albums list. */
export interface AlbumSummary extends AlbumRef {
  created_at: string;
  image_count: number;
  cover_url: string | null;
}

/** A user-created album with its photos. */
export interface Album extends AlbumRef {
  created_at: string;
  images: Image[];
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
