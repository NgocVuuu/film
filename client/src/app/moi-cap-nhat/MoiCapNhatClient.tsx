'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MovieCard } from '@/components/MovieCard';
import LoadingScreen from '@/components/LoadingScreen';
import { PWAAds } from '@/components/PWAAds';
import { API_URL } from '@/lib/config';
import { Clock } from 'lucide-react';

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    year: number;
    episode_current?: string;
    quality?: string;
    updatedAt: string;
}

function MoiCapNhatContent() {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1');
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMovies();
    }, [page]);

    const fetchMovies = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/movies/updated-today`);
            const data = await res.json();
            if (data.success) {
                setMovies(data.data);
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
                    <Clock className="w-6 h-6 text-primary" />
                    Phim Mới Cập Nhật Hôm Nay
                </h1>
                <p className="text-gray-400 mb-8 text-sm max-w-2xl">
                    Danh sách các bộ phim mới đăng hoặc có tập mới được cập nhật trong 24 giờ qua. 
                    Nội dung sẽ thay đổi liên tục khi có diễn biến mới!
                </p>
                {movies.length > 0 ? (
                    <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {movies.map((movie) => (
                                <MovieCard key={movie._id} movie={movie} />
                            ))}
                        </div>
                        <PWAAds variant="inline" />
                    </>
                ) : (
                    <div className="text-center bg-surface-900/50 rounded-2xl py-20 border border-white/5">
                        <p className="text-gray-400">Hiện tại chưa có tập phim mới nào được cập nhật trong hôm nay.</p>
                        <p className="text-gray-500 text-sm mt-2">Vui lòng quay lại sau nhé!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MoiCapNhatClient() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <MoiCapNhatContent />
        </Suspense>
    );
}
