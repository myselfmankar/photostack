import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, Moon, Search, Sun, Upload } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useDemoMode } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Logo } from './Sidebar';

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const { theme, toggle } = useTheme();
  const demo = useDemoMode();

  // Keep the box in sync with /search?q=..., and clear it elsewhere.
  useEffect(() => {
    setQuery(pathname === '/search' ? params.get('q') ?? '' : '');
  }, [pathname, params]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 bg-background/90 px-4 backdrop-blur lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>
      <div className="lg:hidden">
        <Logo />
      </div>

      <form onSubmit={submit} className="hidden max-w-2xl flex-1 sm:block">
        <label className="relative block">
          <span className="sr-only">Search photos</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places, cameras, tags, file names"
            className="h-11 w-full rounded-full bg-muted pl-11 pr-4 text-sm outline-none ring-primary/40 placeholder:text-muted-foreground focus:bg-background focus:ring-2"
          />
        </label>
      </form>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className="sm:hidden" asChild aria-label="Search">
          <Link to="/search">
            <Search className="h-5 w-5" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        {!demo && (
        <Button asChild className="ml-1 gap-2 rounded-full">
          <Link to="/upload">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </Link>
        </Button>
        )}
      </div>
    </header>
  );
}
