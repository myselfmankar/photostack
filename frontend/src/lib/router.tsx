import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Gallery } from '@/pages/Gallery';
import { Albums } from '@/pages/Albums';
import { AlbumDetail } from '@/pages/AlbumDetail';
import { MapView } from '@/pages/MapView';
import { Favorites } from '@/pages/Favorites';
import { Search } from '@/pages/Search';
import { Upload } from '@/pages/Upload';
import { Stats } from '@/pages/Stats';
import { About } from '@/pages/About';
import { ImageDetail } from '@/pages/ImageDetail';
import { Duplicates } from '@/pages/Duplicates';
import { Settings } from '@/pages/Settings';

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
        path: 'map',
        element: <MapView />,
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
      {
        path: 'about',
        element: <About />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);
