import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { X, SlidersHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface FilterState {
    camera?: string;
    location?: string;
    date?: string;
    sortBy: string;
    isFavorite?: boolean;
    status?: string;
}

interface FilterPanelProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    onClear: () => void;
}

export function FilterPanel({ filters, onFilterChange, onClear }: FilterPanelProps) {
    const { data: cameras, isLoading: camerasLoading } = useQuery<string[]>({
        queryKey: ['filters', 'cameras'],
        queryFn: () => apiClient.filters.cameras(),
    });

    const { data: locations, isLoading: locationsLoading } = useQuery<string[]>({
        queryKey: ['filters', 'locations'],
        queryFn: () => apiClient.filters.locations(),
    });

    const { data: dates, isLoading: datesLoading } = useQuery<string[]>({
        queryKey: ['filters', 'dates'],
        queryFn: () => apiClient.filters.dates(),
    });

    const hasActiveFilters = filters.camera || filters.location || filters.date;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-neutral-400" />
                    <h3 className="font-semibold text-sm">Filters</h3>
                </div>
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                        className="h-7 text-xs"
                    >
                        <X className="h-3 w-3 mr-1" />
                        Clear
                    </Button>
                )}
            </div>

            {/* Sort By */}
            <div className="space-y-2">
                <Label className="text-xs text-neutral-400">Sort By</Label>
                <Select
                    value={filters.sortBy}
                    onValueChange={(value) => onFilterChange({ ...filters, sortBy: value })}
                >
                    <SelectTrigger className="bg-neutral-800 border-neutral-700">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                        <SelectItem value="upload_date">Upload Date (Newest)</SelectItem>
                        <SelectItem value="upload_date_asc">Upload Date (Oldest)</SelectItem>
                        <SelectItem value="date_taken">Date Taken (Newest)</SelectItem>
                        <SelectItem value="date_taken_asc">Date Taken (Oldest)</SelectItem>
                        <SelectItem value="filename">Filename (A-Z)</SelectItem>
                        <SelectItem value="size">File Size (Largest)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Camera Filter */}
            <div className="space-y-2">
                <Label className="text-xs text-neutral-400">Camera</Label>
                {camerasLoading ? (
                    <Skeleton className="h-10 bg-neutral-800" />
                ) : (
                    <Select
                        value={filters.camera || 'all'}
                        onValueChange={(value) =>
                            onFilterChange({ ...filters, camera: value === 'all' ? undefined : value })
                        }
                    >
                        <SelectTrigger className="bg-neutral-800 border-neutral-700">
                            <SelectValue placeholder="All Cameras" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                            <SelectItem value="all">All Cameras</SelectItem>
                            {cameras?.map((camera) => (
                                <SelectItem key={camera} value={camera}>
                                    {camera}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
                <Label className="text-xs text-neutral-400">Location</Label>
                {locationsLoading ? (
                    <Skeleton className="h-10 bg-neutral-800" />
                ) : (
                    <Select
                        value={filters.location || 'all'}
                        onValueChange={(value) =>
                            onFilterChange({ ...filters, location: value === 'all' ? undefined : value })
                        }
                    >
                        <SelectTrigger className="bg-neutral-800 border-neutral-700">
                            <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                            <SelectItem value="all">All Locations</SelectItem>
                            {locations?.map((location) => (
                                <SelectItem key={location} value={location}>
                                    {location}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
                <Label className="text-xs text-neutral-400">Date</Label>
                {datesLoading ? (
                    <Skeleton className="h-10 bg-neutral-800" />
                ) : (
                    <Select
                        value={filters.date || 'all'}
                        onValueChange={(value) =>
                            onFilterChange({ ...filters, date: value === 'all' ? undefined : value })
                        }
                    >
                        <SelectTrigger className="bg-neutral-800 border-neutral-700">
                            <SelectValue placeholder="All Dates" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                            <SelectItem value="all">All Dates</SelectItem>
                            {dates?.map((date) => (
                                <SelectItem key={date} value={date}>
                                    {date}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
                <Label className="text-xs text-neutral-400">Processing Status</Label>
                <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) =>
                        onFilterChange({ ...filters, status: value === 'all' ? undefined : value })
                    }
                >
                    <SelectTrigger className="bg-neutral-800 border-neutral-700">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Ready</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Favorite Filter */}
            <div className="pt-2">
                <Button
                    variant={filters.isFavorite ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => onFilterChange({ ...filters, isFavorite: filters.isFavorite ? undefined : true })}
                >
                    <span className={filters.isFavorite ? "text-red-500 mr-2" : "text-neutral-400 mr-2"}>♥</span>
                    {filters.isFavorite ? "Favorites Only" : "Show Favorites Only"}
                </Button>
            </div>
        </div>
    );
}
