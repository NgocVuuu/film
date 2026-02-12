'use client';
import { useEffect, useState } from 'react';

import { MovieCard } from '@/components/MovieCard';
import { API_URL } from '@/lib/config';

export const runtime = 'edge';
import { use } from 'react';

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

interface CatalogPageProps {
    params: Promise<{ category: string }>; // This captures /phim-bo, /phim-le from URL
}

export default function CatalogPage({ params }: CatalogPageProps) {
    const { category } = use(params);
    const categorySlug = category;
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const typeMap: Record<string, string> = {
        'phim-bo': 'series',
        'phim-le': 'single',
        'hoat-hinh': 'hoathinh',
        'tv-shows': 'tvshows',
        'phim-moi': 'latest' // Special key
    };
    const titleMap: Record<string, string> = {
        'phim-bo': 'Phim Bộ',
        'phim-le': 'Phim Lẻ',
        'hoat-hinh': 'Hoạt Hình',
        'tv-shows': 'TV Shows',
        'phim-moi': 'Phim Mới Cập Nhật'
    };

    // const categorySlug = params.category; // e.g., 'phim-bo'
    const apiType = typeMap[categorySlug];

    useEffect(() => {
        if (!apiType) return;
        setLoading(true);

        let url = `${API_URL}/api/movies`;
        if (apiType !== 'latest') {
            url += `?type=${apiType}`;
        }

        fetch(url, { credentials: 'include' })
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
    }, [apiType]);

    if (!apiType) return <div className="min-h-screen bg-deep-black text-white flex items-center justify-center">Danh mục không tồn tại</div>;

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-8 pb-20">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold text-gold-gradient mb-8 border-l-4 border-primary pl-4 uppercase">
                    {titleMap[categorySlug] || 'Danh Sách Phim'}
                </h1>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-surface-800 rounded-lg aspect-[2/3]"></div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {movies.map((movie) => (
                                <MovieCard key={movie._id} movie={movie} />
                            ))}
                        </div>
                        {movies.length === 0 && (
                            <div className="text-center text-gray-500 py-20">Chưa có phim nào trong mục này.</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
