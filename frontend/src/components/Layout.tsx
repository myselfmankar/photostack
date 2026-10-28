import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useDemoMode } from '@/hooks/useApi';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BottomNavbar } from './BottomNavbar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const demo = useDemoMode();

  return (
    <div className="min-h-screen">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64 border-r p-0 pl-3">
          <Sidebar onLinkClick={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="fixed inset-y-0 left-0 hidden pl-3 lg:block">
        <Sidebar />
      </div>

      <div className="lg:pl-64">
        {demo && (
          <div className="bg-accent px-4 py-2 text-center text-sm text-accent-foreground">
            You're looking at a demo with sample photos. Browse, favorite and make albums; uploads and deletes are off.{' '}
            <a href="https://github.com/myselfmankar/photostack" className="font-medium underline" target="_blank" rel="noreferrer">
              Run your own
            </a>
          </div>
        )}
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <main className="pb-20 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <BottomNavbar />
    </div>
  );
}
