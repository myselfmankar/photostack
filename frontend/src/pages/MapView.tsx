import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { useMapData } from '@/hooks/useApi';
import { MapMarker } from '@/types';
import { EmptyState, Page } from '@/components/Page';

/** Each pin is a small round thumbnail of the photo. */
const photoIcon = (m: MapMarker) =>
  L.divIcon({
    className: '',
    html: `<img src="${m.thumbnail_url}" alt="" style="width:44px;height:44px;border-radius:9999px;object-fit:cover;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)" />`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

/** Zoom to fit every photo once the markers are known. */
function FitToMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [map, markers]);
  return null;
}

export function MapView() {
  const { data: markers = [], isLoading } = useMapData();
  const navigate = useNavigate();
  const icons = useMemo(() => new Map(markers.map((m) => [m.id, photoIcon(m)])), [markers]);

  if (!isLoading && markers.length === 0) {
    return (
      <Page title="Map">
        <EmptyState icon={MapPin} title="No photos with a location yet">
          Photos taken with location turned on (most phones) appear here automatically.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page title="Map" subtitle={`${markers.length} photos with a location`}>
      <div className="relative z-0 h-[calc(100vh-11rem)] min-h-[400px] overflow-hidden rounded-xl border">
        <MapContainer center={[20, 0]} zoom={2} className="h-full w-full" worldCopyJump>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup chunkedLoading showCoverageOnHover={false}>
            {markers.map((m) => (
              <Marker
                key={m.id}
                position={[m.latitude, m.longitude]}
                icon={icons.get(m.id)}
                eventHandlers={{ click: () => navigate(`/image/${m.id}`) }}
              >
                {m.address && <Tooltip direction="top" offset={[0, -24]}>{m.address.split(',').slice(0, 2).join(',')}</Tooltip>}
              </Marker>
            ))}
          </MarkerClusterGroup>
          <FitToMarkers markers={markers} />
        </MapContainer>
      </div>
    </Page>
  );
}
