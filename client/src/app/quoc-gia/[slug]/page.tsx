'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
    progress?: {
        currentTime: number;
        duration: number;
        percentage: number;
        episodeSlug: string;
        episodeName: string;
    };
}

const COUNTRY_NAMES: Record<string, string> = {
    'trung-quoc': 'Trung Quốc',
    'han-quoc': 'Hàn Quốc',
    'thai-lan': 'Thái Lan',
    'nhat-ban': 'Nhật Bản',
    'au-my': 'Âu Mỹ',
    'anh': 'Anh',
    'my': 'Mỹ',
    'viet-nam': 'Việt Nam'
};

export default function CountryPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const countrySlug = params.slug as string;
    const page = parseInt(searchParams.get('page') || '1');

    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchMovies();
    }, [countrySlug, page]);

    const fetchMovies = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/api/movies?country=${countrySlug}&page=${page}&limit=24`,
                { credentials: 'include' }
            );
            const data = await res.json();
            if (data.success) {
                setMovies(data.data);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error('Error fetching movies:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingScreen />;

    const countryName = COUNTRY_NAMES[countrySlug] || countrySlug;

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-20 pb-20">
            <div className="container mx-auto px-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-8 bg-primary rounded-full"></span>
                    Phim {countryName}
                </h1>

                {movies.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {movies.map((movie) => (
                                <MovieCard key={movie._id} movie={movie} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-8">
                                {page > 1 && (
                                    <a
                                        href={`/quoc-gia/${countrySlug}?page=${page - 1}`}
                                        className="px-4 py-2 bg-white/10 hover:bg-primary hover:text-black rounded transition-colors"
                                    >
                                        Trang trước
                                    </a>
                                )}
                                <span className="px-4 py-2 bg-primary text-black rounded font-bold">
                                    {page} / {totalPages}
                                </span>
                                {page < totalPages && (
                                    <a
                                        href={`/quoc-gia/${countrySlug}?page=${page + 1}`}
                                        className="px-4 py-2 bg-white/10 hover:bg-primary hover:text-black rounded transition-colors"
                                    >
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
