'use client';
import { Suspense } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MovieCard } from '@/components/MovieCard';
import LoadingScreen from '@/components/LoadingScreen';
import { API_URL } from '@/lib/config';

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    year: number;
    episode_current?: string;
    quality?: string;
}

function PhimChieuRapContent() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1');
    const tab = searchParams.get('tab') || 'dang-chieu'; // 'dang-chieu' | 'sap-chieu'
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);

    const fetchMovies = useCallback(async () => {
        setLoading(true);
        try {
            // Home logic:
            // "Đang chiếu" = chieurap=true + episode_current NOT trailer
            // "Sắp chiếu" = chieurap=true + episode_current contains 'trailer'
            // The API supports chieurap=true, we also need status filter
            // For now we fetch both from backend and filter client-side for trailer
            // since the backend doesn't have a trailer-specific filter param
            const url = tab === 'sap-chieu'
                ? `${API_URL}/api/movies?chieurap=true&status=trailer&page=${page}&limit=24`
                : `${API_URL}/api/movies?chieurap=true&page=${page}&limit=24`;

            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                let list: Movie[] = data.data;
                // Client-side filter to match home slide logic exactly:
                if (tab === 'sap-chieu') {
                    list = list.filter(m =>
                        m.episode_current?.toLowerCase().includes('trailer')
                    );
                } else {
                    list = list.filter(m =>
                        !m.episode_current?.toLowerCase().includes('trailer')
                    );
                }
                setMovies(list);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [page, tab]);

    useEffect(() => {
        fetchMovies();
    }, [fetchMovies]);

    const tabBase = (t: string) =>
        `/danh-sach/phim-chieu-rap?tab=${t}&page=1`;
    const pageUrl = (p: number) =>
        `/danh-sach/phim-chieu-rap?tab=${tab}&page=${p}`;

    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-20 pb-20">
            <div className="container mx-auto px-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-8 bg-primary rounded-full"></span>
                    Phim Chiếu Rạp
                </h1>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { key: 'dang-chieu', label: 'Đang chiếu' },
                        { key: 'sap-chieu', label: 'Sắp chiếu' },
                    ].map(t => (
                        <a
                            key={t.key}
                            href={tabBase(t.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key
                                ? 'bg-primary text-black'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                        >
                            {t.label}
                        </a>
                    ))}
                </div>

                {movies.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {movies.map((movie) => (
                                <MovieCard key={movie._id} movie={movie} />
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-8">
                                {page > 1 && (
                                    <a href={pageUrl(page - 1)} className="px-4 py-2 bg-white/10 hover:bg-primary hover:text-black rounded transition-colors">
                                        Trang trước
                                    </a>
                                )}
                                <span className="px-4 py-2 bg-primary text-black rounded font-bold">{page} / {totalPages}</span>
                                {page < totalPages && (
                                    <a href={pageUrl(page + 1)} className="px-4 py-2 bg-white/10 hover:bg-primary hover:text-black rounded transition-colors">
                                        Trang sau
                                    </a>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-center text-gray-400 py-20">Không tìm thấy phim nào</p>
                )}
            </div>
        </div>
    );
}

export default function PhimChieuRapPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <PhimChieuRapContent />
        </Suspense>
    );
}
