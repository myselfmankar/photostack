import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { useSearch } from '@/hooks/useApi';
import { EmptyState, GridSkeleton, Page } from '@/components/Page';
import { PhotoBrowser } from '@/components/PhotoBrowser';

/** Results for /search?q=... The query box lives in the top bar (and here on phones). */
export function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [draft, setDraft] = useState(q);
  const { data: results = [], isFetching } = useSearch(q);

  useEffect(() => setDraft(q), [q]);

  return (
    <Page title={q ? `Results for “${q}”` : 'Search'} subtitle={q && !isFetching ? `${results.length} photos` : undefined}>
      <form
        className="mb-4 sm:hidden"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) setParams({ q: draft.trim() });
        }}
      >
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Places, cameras, tags, file names"
          className="h-11 w-full rounded-full bg-muted px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          autoFocus={!q}
        />
      </form>

      {!q ? (
        <EmptyState icon={SearchIcon} title="Search your library">
          Try a place (“Pune”), a camera model, a tag, or part of a file name. Every word has to match.
        </EmptyState>
      ) : isFetching && results.length === 0 ? (
        <GridSkeleton />
      ) : results.length === 0 ? (
        <EmptyState icon={SearchIcon} title="No matches">
          Try fewer words: every word must match the place, camera, a tag, or the file name.
        </EmptyState>
      ) : (
        <PhotoBrowser images={results} />
      )}
    </Page>
  );
}
