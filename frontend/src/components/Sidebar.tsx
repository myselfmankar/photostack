import { NavLink } from 'react-router-dom';
import { BarChart3, Copy, FolderOpen, Heart, Images, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MAIN_NAV = [
  { to: '/', label: 'Photos', icon: Images, end: true },
  { to: '/albums', label: 'Albums', icon: FolderOpen },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/favorites', label: 'Favorites', icon: Heart },
];

const LIBRARY_NAV = [
  { to: '/duplicates', label: 'Duplicates', icon: Copy },
  { to: '/stats', label: 'Statistics', icon: BarChart3 },
];

export function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5 px-3 text-[17px] font-semibold tracking-tight">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <rect x="7" y="11" width="18" height="14" rx="3" fill="white" opacity=".55" />
        <rect x="10" y="7" width="18" height="14" rx="3" fill="white" />
      </svg>
      PhotoStack
    </NavLink>
  );
}

function NavItem({ to, label, icon: Icon, end, onClick }: (typeof MAIN_NAV)[number] & { onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </NavLink>
  );
}

export function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  return (
    <aside className="flex h-full w-60 flex-col gap-6 bg-background py-4 pr-3">
      <div className="flex h-10 items-center">
        <Logo />
      </div>
      <nav className="space-y-1">
        {MAIN_NAV.map((item) => (
          <NavItem key={item.to} {...item} onClick={onLinkClick} />
        ))}
      </nav>
      <div>
        <p className="mb-1 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Library</p>
        <nav className="space-y-1">
          {LIBRARY_NAV.map((item) => (
            <NavItem key={item.to} {...item} onClick={onLinkClick} />
          ))}
        </nav>
      </div>
    </aside>
  );
}
