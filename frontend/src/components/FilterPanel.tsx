import { X } from 'lucide-react';
import { useCameraFilters, useDateFilters, useLocationFilters } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FilterState {
  sortBy: string;
  camera?: string;
  location?: string;
  date?: string;
}

export const SORTS = {
  date_taken: 'Date taken (newest)',
  date_taken_asc: 'Date taken (oldest)',
  upload_date: 'Recently added',
  filename: 'File name',
} as const;

const ALL = '__all__';

function Filter({
  value,
  placeholder,
  options,
  onChange,
  format = (v) => v,
}: {
  value?: string;
  placeholder: string;
  options?: string[];
  onChange: (v?: string) => void;
  format?: (v: string) => string;
}) {
  if (!options?.length) return null;
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger className="h-9 w-auto max-w-[220px] gap-2 rounded-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {format(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};
// Addresses are long ("Mall, Road, Area, City, ..."); show the first two parts.
const shortPlace = (a: string) => a.split(',').slice(0, 2).join(',');

/** Sort + filter dropdowns for the Photos page. Filters with no options are hidden. */
export function FilterPanel({ filters, onChange }: { filters: FilterState; onChange: (f: FilterState) => void }) {
  const { data: cameras } = useCameraFilters();
  const { data: places } = useLocationFilters();
  const { data: months } = useDateFilters();
  const active = filters.camera || filters.location || filters.date;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.sortBy} onValueChange={(sortBy) => onChange({ ...filters, sortBy })}>
        <SelectTrigger className="h-9 w-auto gap-2 rounded-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SORTS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Filter
        value={filters.camera}
        placeholder="All cameras"
        options={cameras}
        onChange={(camera) => onChange({ ...filters, camera })}
      />
      <Filter
        value={filters.location}
        placeholder="All places"
        options={places}
        format={shortPlace}
        onChange={(location) => onChange({ ...filters, location })}
      />
      <Filter
        value={filters.date}
        placeholder="All months"
        options={months}
        format={monthLabel}
        onChange={(date) => onChange({ ...filters, date })}
      />
      {active && (
        <Button variant="ghost" size="sm" className="gap-1 rounded-full" onClick={() => onChange({ sortBy: filters.sortBy })}>
          <X className="h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}
