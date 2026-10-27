import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload as UploadIcon, Info, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { AnimatedMoreButton } from './AnimatedMoreButton';

interface TopBarProps {
    onMenuClick?: () => void;
    showMenuButton?: boolean;
}

export function TopBar({ onMenuClick, showMenuButton }: TopBarProps) {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/80 z-40">
            <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
                {showMenuButton && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden text-neutral-400 hover:text-white"
                        onClick={onMenuClick}
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                )}

                <form onSubmit={handleSearch} className="flex-1 max-w-3xl">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                        <Input
                            type="search"
                            placeholder="Search by place, camera, tag, or filename"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-neutral-900 border-neutral-800 focus:border-neutral-700 h-10 w-full"
                        />
                    </div>
                </form>
                {/* Right Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <AnimatedMoreButton className="h-9 w-9" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-neutral-900 border-neutral-800">
                        <DropdownMenuItem
                            onClick={() => navigate('/upload')}
                            className="cursor-pointer"
                        >
                            <UploadIcon className="h-5 w-5 mr-2" />
                            Upload Images
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-neutral-800" />
                        <DropdownMenuItem
                            onClick={() => navigate('/settings')}
                            className="cursor-pointer"
                        >
                            <Settings className="h-5 w-5 mr-2" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate('/about')}
                            className="cursor-pointer"
                        >
                            <Info className="h-5 w-5 mr-2" />
                            About
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
