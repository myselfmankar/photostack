import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Gallery } from '@/pages/Gallery';
import { Albums } from '@/pages/Albums';
import { AlbumDetail } from '@/pages/AlbumDetail';
import { CustomAlbum } from '@/pages/CustomAlbum';
import { Favorites } from '@/pages/Favorites';
import { Search } from '@/pages/Search';
import { Upload } from '@/pages/Upload';
import { Stats } from '@/pages/Stats';
import { ImageDetail } from '@/pages/ImageDetail';
import { Duplicates } from '@/pages/Duplicates';

// The map pulls in Leaflet (~300 KB), so it loads only when the Map page is opened.
const MapView = lazy(() => import('@/pages/MapView').then((m) => ({ default: m.MapView })));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Gallery />,
      },
      {
        path: 'image/:id',
        element: <ImageDetail />,
      },
      {
        path: 'albums',
        element: <Albums />,
      },
      {
        path: 'albums/:year/:month',
        element: <AlbumDetail />,
      },
      {
        path: 'albums/:id',
        element: <CustomAlbum />,
      },
      {
        path: 'map',
        element: (
          <Suspense fallback={null}>
            <MapView />
          </Suspense>
        ),
      },
      {
        path: 'favorites',
        element: <Favorites />,
      },
      {
        path: 'duplicates',
        element: <Duplicates />,
      },
      {
        path: 'search',
        element: <Search />,
      },
      {
        path: 'upload',
        element: <Upload />,
      },
      {
        path: 'stats',
        element: <Stats />,
      },
    ],
  },
]);
