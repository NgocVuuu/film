'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MovieCard } from '@/components/MovieCard';
import RequestMovieButton from '@/components/RequestMovieButton';
import { SearchSidebar } from '@/components/SearchSidebar';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { Search, Filter, X } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { Button } from '@/components/ui/button';

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    year: number;
    episode_current?: string;
    quality?: string;
    progress?: {
        currentTime: number;
        duration: number;
        percentage: number;
        episodeSlug: string;
        episodeName: string;
    };
}

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    // const query = searchParams.get('q'); // Old standard query
    // New: Construct query string from all params
    const queryString = searchParams.toString();
    const queryKeyword = searchParams.get('q');
    const [searchQuery, setSearchQuery] = useState(queryKeyword || '');

    const [movies, setMovies] = useState<Movie[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 24,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(false);
    const [showMobileFilter, setShowMobileFilter] = useState(false);

    useEffect(() => {
        if (showMobileFilter) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };
    }, [showMobileFilter]);

    useEffect(() => {
        setSearchQuery(queryKeyword || '');
    }, [queryKeyword]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (searchQuery.trim()) {
            params.set('q', searchQuery);
        } else {
            params.delete('q');
        }
        params.delete('page'); // Reset pagination
        router.push(`/search?${params.toString()}`);
    };

    // FilterBar and Pagination components need to be imported
    // Assuming imports are added at top

    useEffect(() => {
        setLoading(true);
        // Use the new getMovies endpoint if no keyword, or if filters are present
        // Actually, the requirement is to add filters. 
        // If 'q' is present, we might be using the 'search' endpoint which is different?
        // Let's check: 
        // /api/search -> hybridSearch (DB + External) -> usually for keywords
        // /api/movies -> getMovies (DB only, with filters) -> for browsing/filtering

        // Strategy: 
        // If only 'q' is present and no other filters -> Use /api/search (Hybrid)
        // If filters are present (even with 'q'?) -> Use /api/movies (DB Filter) 
        // Note: Hybrid search usually doesn't support advanced filters on external sources easily.
        // Let's split user expectation: "Advanced Filter" usually implies browsing the local library.

        // If we want to support keyword search + filters, we should probably stick to DB search for filters.

        const endpoint = `${API_URL}/api/movies?${queryString}`; // Default to DB filter

        // If purely keyword search without filters (except maybe page?), use the hybrid search
        // But wait, the user wants "Advanced Search & Filter".
        // Let's prioritize the DB filter endpoint (/api/movies) because we implemented the logic there.
        // We just need to make sure 'q' is handled if passed?
        // Wait, getMovies (DB) might not handle 'q' (regex search) in my previous edit?
        // Let's check my previous edit to `movieController.js`.
        // I added filters: category, country, year, status. 
        // I DID NOT add 'name' regex search in `getMovies`.

        // Correction: I should update `getMovies` to also handle `q` or `name` if I want to merge them.
        // Or I keep them separate.
        // If I use /api/movies, I need to add name search there too given the context.
        // Let's stick to /api/movies for now and maybe add 'q' support to it later if needed.
        // BUT, `search/page.tsx` was originally for "Search Results".

        // Let's use /api/movies for everything for now to support filters. 
        // Users can type a keyword in the navbar, it goes to /search?q=...
        // If they then click a filter, it adds params.

        // Issue: My `getMovies` implementation DOES NOT search by name `q`. 
        // I need to update `getMovies` to support `q` param as well for text search.
        // For now, I will proceed with frontend integration, but I will likely need to patch backend next.

        fetch(endpoint, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setMovies(data.data);
                    if (data.pagination) setPagination(data.pagination);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, [queryString]);

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-8 pb-20">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <div className="hidden lg:block">
                        <SearchSidebar />
                    </div>

                    {/* Mobile Filters Drawer */}
                    {showMobileFilter && (
                        <div className="fixed inset-0 z-100 lg:hidden flex justify-end">
                            <div 
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                                onClick={() => setShowMobileFilter(false)}
                                aria-hidden="true"
                            />
                            <div className="relative w-75 max-w-[85vw] bg-surface-900 h-dvh border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-surface-900 z-10">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Filter className="w-5 h-5 text-primary" />
                                        Bộ lọc tìm kiếm
                                    </h2>
                                    <button 
                                        onClick={() => setShowMobileFilter(false)} 
                                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 bg-white/5"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-24">
                                    <SearchSidebar />
                                </div>

                                {/* Footer Button */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-surface-900/95 backdrop-blur shadow-[0_-4px_12px_rgba(0,0,0,0.5)] z-20 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                                    <Button 
                                        className="w-full text-base font-bold py-6 shadow-lg shadow-primary/20" 
                                        onClick={() => setShowMobileFilter(false)}
                                    >
                                        Xem kết quả
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Search Input */}
                        <form onSubmit={handleSearch} className="mb-8 relative group">
                            <div className="relative flex items-center w-full">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm tên phim, diễn viên..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-surface-900/80 backdrop-blur-sm border border-white/10 rounded-xl py-3.5 pl-12 pr-28 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-lg"
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors duration-300" />
                                <div className="absolute right-1.5 top-1.5 bottom-1.5">
                                    <Button 
                                        type="submit" 
                                        className="h-full px-6 rounded-lg bg-primary hover:bg-gold-600 text-black font-bold shadow-md hover:shadow-primary/20 transition-all duration-300 transform active:scale-95"
                                        size="sm"
                                    >
                                        Tìm kiếm
                                    </Button>
                                </div>
                            </div>
                        </form>

                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <div className="flex items-center justify-between gap-4 w-full md:w-auto">
                                <h1 className="text-2xl font-bold text-white">
                                    {queryKeyword ? (
                                        <>Kết quả tìm kiếm: <span className="text-primary">&quot;{queryKeyword}&quot;</span></>
                                    ) : (
                                        'Khám phá phim'
                                    )}
                                </h1>
                                <button 
                                    className="lg:hidden flex items-center gap-2 px-3 py-2 bg-surface-800 text-white rounded-lg border border-white/10 hover:bg-surface-700 transition-colors text-sm font-medium ml-auto md:ml-0"
                                    onClick={() => setShowMobileFilter(true)}
                                >
                                    <Filter className="w-4 h-4" />
                                    Bộ lọc
                                </button>
                            </div>
                            {/* Desktop Sort/Filter could go here if separat
                            {/* Mobile Filter Toggle could go here */}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="animate-pulse bg-surface-800 rounded-lg aspect-2/3"></div>
                                ))}
                            </div>
                        ) : (
                            <>
                                {movies.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {movies.map((movie) => (
                                            <MovieCard key={movie._id} movie={movie} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="Không tìm thấy phim"
                                        description={`Không tìm thấy kết quả nào cho "${queryKeyword || 'bộ lọc hiện tại'}".`}
                                        actionLabel="Xóa bộ lọc"
                                        actionLink="/search"
                                        icon={Search}
                                    />
                                )}

                                {movies.length === 0 && queryKeyword && (
                                    <div className="mt-8 bg-surface-800/50 p-6 rounded-xl border border-white/5 max-w-md mx-auto text-center">
                                        <h3 className="text-xl font-bold text-white mb-2">Bạn muốn xem phim này?</h3>
                                        <p className="text-gray-400 text-sm mb-6">
                                            Hãy gửi yêu cầu để chúng tôi cập nhật phim này lên hệ thống sớm nhất có thể!
                                        </p>
                                        <RequestMovieButton movieName={queryKeyword || ''} />
                                    </div>
                                )}

                                {/* Pagination */}
                                {movies.length > 0 && (
                                    <div className="mt-8">
                                        <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

import LoadingScreen from '@/components/LoadingScreen';

export default function SearchPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <SearchContent />
        </Suspense>
    );
}
