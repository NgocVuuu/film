'use client';
import { useEffect, useState } from 'react';
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

const DECADES = [
    { label: '2020s', range: [2020, 2030] },
    { label: '2010s', range: [2010, 2019] },
    { label: '2000s', range: [2000, 2009] },
    { label: '1990s', range: [1990, 1999] },
    { label: 'Classics', range: [0, 1989] },
];

export default function SadMoviesPage() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/movies/sad-movies`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => { if (data.success) setMovies(data.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-deep-black text-foreground pb-20">
            {/* Hero Banner */}
            <div
                className="relative w-full overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 30%, #0d1a2e 70%, #0a0a1a 100%)',
                    minHeight: 260
                }}
            >
                {/* Ambient blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-80px] left-[-80px] w-96 h-96 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #6b7fff, transparent)' }} />
                    <div className="absolute bottom-[-60px] right-[-60px] w-72 h-72 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #ff6b9d, transparent)' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] opacity-5"
                        style={{ background: 'radial-gradient(ellipse, #9d7fff, transparent)' }} />
                    {/* Rain drops decorative */}
                    {[...Array(8)].map((_, i) => (
                        <div key={i}
                            className="absolute w-[1px] opacity-20 rounded-full"
                            style={{
                                background: 'linear-gradient(to bottom, transparent, #a0b4ff)',
                                left: `${10 + i * 12}%`,
                                top: '0',
                                height: `${60 + (i % 3) * 30}px`,
                                animationDelay: `${i * 0.3}s`
                            }}
                        />
                    ))}
                </div>

                <div className="relative container mx-auto px-4 py-14 flex flex-col items-center justify-center text-center">
                    <h1 className="text-white text-2xl md:text-4xl font-bold mb-3 leading-tight">
                        Phim Chữa Rách Vết Thương Lành
                    </h1>
                    <p className="text-blue-200/60 text-sm md:text-base max-w-2xl leading-relaxed">
                        Đôi khi ta cần một bộ phim để khóc thật to, để trút hết mọi nỗi lòng rồi nhẹ nhàng bước tiếp.
                        Muốn khóc mà không thể? Để những bộ phim này làm điều đó thay bạn.
                    </p>
                    <div className="mt-5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-sm">
                        {movies.length} bộ phim
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pt-10">
                {DECADES.map(decade => {
                    const decadeMovies = movies.filter(m => m.year >= decade.range[0] && m.year <= decade.range[1]);
                    if (decadeMovies.length === 0) return null;
                    return (
                        <div key={decade.label} className="mb-12">
                            <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(to bottom, #6b7fff, #ff6b9d)' }} />
                                {decade.label}
                                {decade.range[0] > 0 && (
                                    <span className="text-sm text-gray-500 font-normal">
                                        ({decade.range[0]}–{decade.range[1] > 2026 ? 'nay' : decade.range[1]})
                                    </span>
                                )}
                                <span className="ml-auto text-xs text-gray-600">{decadeMovies.length} phim</span>
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {decadeMovies.map(movie => (
                                    <MovieCard key={movie._id} movie={movie} />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {movies.length === 0 && (
                    <p className="text-center text-gray-400 py-20">Không tìm thấy phim nào</p>
                )}
            </div>
        </div>
    );
}
