import { Link, useLocation } from 'react-router-dom';
import {
    Image as ImageIcon,
    Calendar,
    Map,
    Heart,
    Search,
    BarChart3,
    Copy, // Added Copy icon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
    const location = useLocation();

    const navItems = [
        { icon: ImageIcon, label: 'Gallery', href: '/' },
        { icon: Calendar, label: 'Albums', href: '/albums' },
        { icon: Map, label: 'Map', href: '/map' },
        { icon: Heart, label: 'Favorites', href: '/favorites' },
        { icon: Copy, label: 'Duplicates', href: '/duplicates' }, // Added Duplicates
        { icon: Search, label: 'Search', href: '/search' },
        { icon: BarChart3, label: 'Stats', href: '/stats' },
    ];

    return (
        <aside className="flex flex-col h-full bg-neutral-950 border-r border-neutral-800 lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-64">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-neutral-800">
                <Link to="/" className="flex items-center gap-3" onClick={onLinkClick}>
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-semibold text-lg">PhotoVault</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map(({ icon: Icon, label, href }) => {
                    const isActive = location.pathname === href;

                    return (
                        <Link
                            key={href}
                            to={href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                                isActive
                                    ? 'bg-neutral-800 text-white'
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                            )}
                            onClick={onLinkClick}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-800">
                <div className="text-xs text-neutral-500 space-y-1">
                    <div>AI-Powered DAM</div>
                    <div className="text-neutral-600">v1.0.0</div>
                </div>
            </div>
        </aside>
    );
}
