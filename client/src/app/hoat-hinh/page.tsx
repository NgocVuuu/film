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

function HoatHinhContent() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1');
    const sort = searchParams.get('sort') || 'view';
    const maxYear = searchParams.get('maxYear') || '';
    const category = searchParams.get('category') || '';
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);

    const fetchMovies = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                type: 'hoathinh',
                sort,
                page: String(page),
                limit: '30'
            });
            if (maxYear) params.set('maxYear', maxYear);
            // Pass category but keep type=hoathinh (type param overrides category's type exclusion in API)
            if (category) params.set('category', category);

            const res = await fetch(
                `${API_URL}/api/movies?${params.toString()}`,
                { credentials: 'include' }
            );
            const data = await res.json();
            if (data.success) {
                setMovies(data.data);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [page, sort, maxYear, category]);

    useEffect(() => {
        fetchMovies();
    }, [fetchMovies]);

    const extraParams = `${maxYear ? `&maxYear=${maxYear}` : ''}${category ? `&category=${category}` : ''}`;
    const pageUrl = (p: number) => `/hoat-hinh?sort=${sort}${extraParams}&page=${p}`;
    const sortUrl = (s: string) => `/hoat-hinh?sort=${s}${extraParams}&page=1`;

    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-20 pb-20">
            <div className="container mx-auto px-4">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <span className="w-1 h-8 bg-primary rounded-full"></span>
                        {maxYear ? `Anime Huyền thoại (trước ${parseInt(maxYear) + 1})` : category === 'gia-dinh' ? 'Hoạt Hình Gia Đình' : 'Hoạt Hình & Anime'}
                    </h1>
                    <div className="flex gap-2">
                        {[
                            { key: 'view', label: 'Xem nhiều nhất' },
                            { key: 'newest', label: 'Mới nhất' },
                        ].map(s => (
                            <a
                                key={s.key}
                                href={sortUrl(s.key)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sort === s.key
                                    ? 'bg-primary text-black'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                            >
                                {s.label}
                            </a>
                        ))}
                    </div>
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

export default function HoatHinhPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <HoatHinhContent />
        </Suspense>
    );
}
