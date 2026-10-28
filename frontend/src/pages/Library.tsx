import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarX2,
  ChevronRight,
  CircleCheck,
  Copy,
  FileWarning,
  Film,
  MapPinOff,
  RotateCw,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { useDemoMode, useLibraryHealth, useReindex } from '@/hooks/useApi';
import { Issue, LibraryHealth } from '@/types';
import { Button } from '@/components/ui/button';
import { Page } from '@/components/Page';

const formatBytes = (n: number) =>
  n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(n / 1024 ** 2))} MB`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Every issue the backend reports, in priority order, in plain words. */
const ISSUES: { issue: Issue; icon: LucideIcon; title: (n: number) => string; why: string; retry?: string }[] = [
  {
    issue: 'failed',
    icon: FileWarning,
    title: (n) => `${plural(n, 'file')} couldn't be read`,
    why: "They're damaged or not really images, so they don't appear anywhere else. Replace the file, then retry.",
    retry: 'Retry',
  },
  {
    issue: 'video_no_thumbnail',
    icon: Film,
    title: (n) => `${plural(n, 'video')} without a thumbnail`,
    why: 'They were added before ffmpeg was installed on the server.',
    retry: 'Re-index',
  },
  {
    issue: 'no_date',
    icon: CalendarX2,
    title: (n) => `${plural(n, 'photo')} without a date`,
    why: 'Usually screenshots or downloads. They sit in the timeline on the day they were uploaded.',
  },
  {
    issue: 'no_location',
    icon: MapPinOff,
    title: (n) => `${plural(n, 'photo')} without a location`,
    why: "They won't show on the map. Phones only record location when it's turned on for the camera.",
  },
  {
    issue: 'flagged',
    icon: ShieldAlert,
    title: (n) => `${plural(n, 'file')} flagged by integrity checks`,
    why: 'Edited in a photo editor, or carrying extra data after the image. Often harmless, worth a look.',
  },
];

function IssueRow({
  to,
  icon: Icon,
  title,
  why,
  action,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  why: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-4 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <Link to={to} className="group min-w-0 flex-1">
        <p className="font-medium group-hover:underline">{title}</p>
        <p className="text-sm text-muted-foreground">{why}</p>
      </Link>
      {action}
      <Link to={to} aria-label={`Show: ${title}`} className="text-muted-foreground hover:text-foreground">
        <ChevronRight className="h-5 w-5" />
      </Link>
    </li>
  );
}

function NeedsAttention({ health }: { health: LibraryHealth }) {
  const reindex = useReindex();
  const queryClient = useQueryClient();
  const demo = useDemoMode();

  const retry = async (issue: Issue) => {
    try {
      const { queued } = await reindex.mutateAsync(issue);
      toast.success(`Re-indexing ${plural(queued, 'file')}…`);
      // Indexing runs in the background on the server; check back shortly.
      setTimeout(() => queryClient.invalidateQueries(), 3000);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const rows = ISSUES.filter(({ issue }) => health.issues[issue] > 0);
  const { duplicates } = health;

  if (rows.length === 0 && duplicates.groups === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border p-5">
        <CircleCheck className="h-6 w-6 text-emerald-500" />
        <div>
          <p className="font-medium">Nothing needs attention</p>
          <p className="text-sm text-muted-foreground">Every file was read, dated and located, with no duplicates.</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-xl border">
      {rows.map(({ issue, icon, title, why, retry: retryLabel }) => (
        <IssueRow
          key={issue}
          to={`/library/${issue}`}
          icon={icon}
          title={title(health.issues[issue])}
          why={why}
          action={
            retryLabel &&
            !demo && (
              <Button size="sm" variant="outline" className="gap-2 rounded-full" disabled={reindex.isPending} onClick={() => retry(issue)}>
                <RotateCw className="h-4 w-4" /> {retryLabel}
              </Button>
            )
          }
        />
      ))}
      {duplicates.groups > 0 && (
        <IssueRow
          to="/duplicates"
          icon={Copy}
          title={`${plural(duplicates.copies, 'duplicate copy')} (${formatBytes(duplicates.wasted_bytes)})`}
          why={`${plural(duplicates.groups, 'photo')} saved more than once. Delete the copies to free the space.`}
        />
      )}
    </ul>
  );
}

/** What's in the library and what needs fixing. Every number links to the photos behind it. */
export function Library() {
  const { data: health } = useLibraryHealth();

  return (
    <Page title="Library">
      {health && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Photos" value={health.photos.toLocaleString()} />
            <Stat label="Videos" value={health.videos.toLocaleString()} />
            <Stat label="Originals" value={formatBytes(health.storage.originals)} />
            <Stat label="Thumbnails & previews" value={formatBytes(health.storage.thumbnails)} />
          </div>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Needs attention</h2>
            <NeedsAttention health={health} />
          </section>

          {health.cameras.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Cameras</h2>
              <ul className="divide-y rounded-xl border">
                {health.cameras.map((c) => (
                  <li key={c.name}>
                    <Link
                      to={`/search?q=${encodeURIComponent(c.name)}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted"
                    >
                      <span>{c.name}</span>
                      <span className="text-muted-foreground">{plural(c.value, 'photo')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
