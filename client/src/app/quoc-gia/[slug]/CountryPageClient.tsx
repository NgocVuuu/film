'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { MovieCard } from '@/components/MovieCard';
import LoadingScreen from '@/components/LoadingScreen';
import { Pagination } from '@/components/Pagination';
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

export const COUNTRY_NAMES: Record<string, string> = {
    'trung-quoc': 'Trung Quốc',
    'han-quoc': 'Hàn Quốc',
    'thai-lan': 'Thái Lan',
    'nhat-ban': 'Nhật Bản',
    'au-my': 'Âu Mỹ (Hollywood)',
    'anh': 'Anh',
    'my': 'Mỹ',
    'viet-nam': 'Việt Nam',
    'hong-kong': 'Hồng Kông',
    'phap': 'Pháp',
    'duc': 'Đức',
    'an-do': 'Ấn Độ',
};

function CountryPageContent() {
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
            const isWestern = countrySlug === 'au-my';
            const isChinese = countrySlug === 'trung-quoc';
            const url = isWestern
                ? `${API_URL}/api/movies?country=au-my&type=single&page=${page}&limit=30`
                : isChinese
                ? `${API_URL}/api/movies?country=trung-quoc&excludeType=hoathinh&page=${page}&limit=30`
                : `${API_URL}/api/movies?country=${countrySlug}&page=${page}&limit=30`;

            const res = await fetch(url, { credentials: 'include' });
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
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {movies.map((movie) => (
                                <MovieCard key={movie._id} movie={movie} />
                            ))}
                        </div>

                        <Pagination currentPage={page} totalPages={totalPages} baseUrl={`/quoc-gia/${countrySlug}`} />
                    </>
                ) : (
                    <p className="text-center text-gray-400 py-20">Không tìm thấy phim nào</p>
                )}
            </div>
        </div>
    );
}

export default function CountryPageClient() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <CountryPageContent />
        </Suspense>
    );
}
