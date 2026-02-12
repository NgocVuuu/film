'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
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
    progress?: Record<string, unknown>;
}

function PhimMoiContent() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1');
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchMovies();
    }, [page]);

    const fetchMovies = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/api/movies?sort=newest&page=${page}&limit=24`,
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
    };

    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-20 pb-20">
            <div className="container mx-auto px-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-8 bg-primary rounded-full"></span>
                    Phim Mới Cập Nhật
                </h1>
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
                                    <a href={`/phim-moi?page=${page - 1}`} className="px-4 py-2 bg-white/10 hover:bg-primary hover:text-black rounded transition-colors">
                                        Trang trước
                                    </a>
                                )}
                                <span className="px-4 py-2 bg-primary text-black rounded font-bold">{page} / {totalPages}</span>
                                {page < totalPages && (
                                    <a href={`/phim-moi?page=${page + 1}`} className="px-4 py-2 bg-white/10 hover:bg-primary hover:text-black rounded transition-colors">
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

export default function PhimMoiPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <PhimMoiContent />
        </Suspense>
    );
}
