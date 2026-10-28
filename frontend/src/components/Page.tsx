import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

/** Standard page padding + title row (title left, actions right). */
export function Page({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-4 pb-8 lg:px-6">
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-3 py-4">
          <div className="min-w-0">
            {title && <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>}
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/** Grey blocks shaped like a photo grid while loading. */
export function GridSkeleton() {
  const widths = [260, 180, 300, 220, 200, 280, 240, 190, 320, 210];
  return (
    <div className="flex flex-wrap gap-1">
      {widths.map((w, i) => (
        <div key={i} className="h-[120px] animate-pulse bg-muted sm:h-[180px] lg:h-[220px]" style={{ flexGrow: w, width: w * 0.6 }} />
      ))}
    </div>
  );
}
