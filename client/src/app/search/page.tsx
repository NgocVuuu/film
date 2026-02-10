'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MovieCard } from '@/components/MovieCard';
import { API_URL } from '@/lib/config';

function SearchContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q');
    const [movies, setMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query) return;
        setLoading(true);
        fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setMovies(data.data);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, [query]);

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-8 pb-20">
            <div className="container mx-auto px-4">
                <h1 className="text-2xl font-bold text-white mb-8">
                    Kết quả tìm kiếm cho: <span className="text-primary">"{query}"</span>
                </h1>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-surface-800 rounded-lg aspect-[2/3]"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {movies.length > 0 ? (
                            movies.map((movie) => (
                                <MovieCard key={movie._id} movie={movie} />
                            ))
                        ) : (
                            <div className="col-span-full text-center text-gray-500 py-10">
                                Không tìm thấy phim nào phù hợp.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-deep-black text-white flex items-center justify-center">Đang tải...</div>}>
            <SearchContent />
        </Suspense>
    );
}
