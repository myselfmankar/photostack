import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BottomNavbar } from './BottomNavbar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <main className="pb-20 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <BottomNavbar />
    </div>
  );
}
