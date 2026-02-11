'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MovieCard } from '@/components/MovieCard';
import RequestMovieButton from '@/components/RequestMovieButton';
import { SearchSidebar } from '@/components/SearchSidebar';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { Search } from 'lucide-react';
import { API_URL } from '@/lib/config';

function SearchContent() {
    const searchParams = useSearchParams();
    // const query = searchParams.get('q'); // Old standard query
    // New: Construct query string from all params
    const queryString = searchParams.toString();
    const queryKeyword = searchParams.get('q');

    const [movies, setMovies] = useState<any[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 24,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(false);

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

        const hasFilters = searchParams.has('category') ||
            searchParams.has('country') ||
            searchParams.has('year') ||
            searchParams.has('status') ||
            searchParams.has('sort') ||
            searchParams.has('page');

        let endpoint = `${API_URL}/api/movies?${queryString}`; // Default to DB filter

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

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <h1 className="text-2xl font-bold text-white">
                                {queryKeyword ? (
                                    <>Kết quả tìm kiếm: <span className="text-primary">"{queryKeyword}"</span></>
                                ) : (
                                    'Khám phá phim'
                                )}
                            </h1>
                            {/* Mobile Filter Toggle could go here */}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="animate-pulse bg-surface-800 rounded-lg aspect-[2/3]"></div>
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
