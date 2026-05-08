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

export const CATEGORY_NAMES: Record<string, string> = {
    'hanh-dong': 'Hành Động',
    'tinh-cam': 'Tình Cảm',
    'hai-huoc': 'Hài Hước',
    'co-trang': 'Cổ Trang',
    'tam-ly': 'Tâm Lý',
    'hinh-su': 'Hình Sự',
    'chien-tranh': 'Chiến Tranh',
    'the-thao': 'Thể Thao',
    'vo-thuat': 'Võ Thuật',
    'vien-tuong': 'Viễn Tưởng',
    'phieu-luu': 'Phiêu Lưu',
    'khoa-hoc': 'Khoa Học',
    'kinh-di': 'Kinh Dị',
    'am-nhac': 'Âm Nhạc',
    'than-thoai': 'Thần Thoại',
    'tai-lieu': 'Tài Liệu',
    'gia-dinh': 'Gia Đình',
    'chinh-kich': 'Chính Kịch',
    'bi-an': 'Bí Ẩn',
    'hoc-duong': 'Học Đường',
    'short-drama': 'Short Drama',
};

function CategoryPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const categorySlug = params.slug as string;
    const page = parseInt(searchParams.get('page') || '1');

    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchMovies();
    }, [categorySlug, page]);

    const fetchMovies = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/api/movies?category=${categorySlug}&page=${page}&limit=30`,
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

    const categoryName = CATEGORY_NAMES[categorySlug] || categorySlug;

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-20 pb-20">
            <div className="container mx-auto px-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-8 bg-primary rounded-full"></span>
                    Phim {categoryName}
                </h1>

                {movies.length > 0 ? (
                    <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {movies.map((movie) => (
                                <MovieCard key={movie._id} movie={movie} />
                            ))}
                        </div>

                        <Pagination currentPage={page} totalPages={totalPages} baseUrl={`/the-loai/${categorySlug}`} />
                    </>
                ) : (
                    <p className="text-center text-gray-400 py-20">Không tìm thấy phim nào</p>
                )}
            </div>
        </div>
    );
}

export default function CategoryPageClient() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <CategoryPageContent />
        </Suspense>
    );
}
