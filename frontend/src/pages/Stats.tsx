import { useStats } from '@/hooks/useApi';
import { Page } from '@/components/Page';

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

/** A labelled horizontal bar chart in plain HTML (themes with the rest of the app). */
function Bars({ title, rows, empty }: { title: string; rows: { name: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-xl border p-5">
      <h2 className="mb-4 font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.name} className="text-sm">
              <div className="mb-1 flex justify-between gap-4">
                <span className="truncate" title={r.name}>
                  {r.name}
                </span>
                <span className="tabular-nums text-muted-foreground">{r.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const formatSize = (bytes: number) =>
  bytes > 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;

export function Stats() {
  const { data: stats } = useStats();
  if (!stats) return <Page title="Statistics">{null}</Page>;

  const places = stats.location_stats.map((p) => ({ ...p, name: p.name.split(',').slice(0, 2).join(',') }));
  const uploads = stats.uploads_by_month.map((m) => ({ name: m.month, value: m.count }));

  return (
    <Page title="Statistics">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Photos" value={stats.total_images} />
        <Tile label="Storage used" value={formatSize(stats.total_size)} />
        <Tile label="Favorites" value={stats.favorites_count} />
        <Tile label="Cameras" value={stats.camera_stats.length} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Bars title="Top cameras" rows={stats.camera_stats} empty="No camera information yet." />
        <Bars title="Top places" rows={places} empty="No photos with a location yet." />
        <Bars title={`Uploads in ${new Date().getFullYear()}`} rows={uploads} empty="Nothing uploaded this year." />
      </div>
    </Page>
  );
}
