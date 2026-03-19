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

const PHASES = [
    { label: 'Giai đoạn 1', years: [2008, 2012] },
    { label: 'Giai đoạn 2', years: [2013, 2015] },
    { label: 'Giai đoạn 3', years: [2016, 2019] },
    { label: 'Giai đoạn 4', years: [2021, 2021] },
    { label: 'Giai đoạn 5', years: [2022, 2024] },
    { label: 'Giai đoạn 6', years: [2025, 2030] },
];

export default function MarvelPage() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/movies/marvel`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (data.success) setMovies(data.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-deep-black text-foreground pb-20">
            {/* Hero Banner */}
            <div className="relative w-full overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1a0000 0%, #8B0000 50%, #1a0000 100%)', minHeight: 220 }}>
                {/* Decorative blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-60px] left-[-60px] w-72 h-72 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #ff0000, transparent)' }} />
                    <div className="absolute bottom-[-40px] right-[-40px] w-56 h-56 rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, #ff4444, transparent)' }} />
                </div>
                <div className="relative container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
                    {/* Marvel Logo text */}
                    <div className="inline-block bg-[#ED1D24] px-8 py-2 mb-4 tracking-[0.3em] font-black text-white text-2xl md:text-4xl rounded"
                        style={{ fontFamily: 'Impact, "Arial Black", sans-serif', letterSpacing: '0.25em' }}>
                        MARVEL
                    </div>
                    <h1 className="text-white text-xl md:text-3xl font-bold mb-2">Vũ Trụ Điện Ảnh Marvel (MCU)</h1>
                    <p className="text-gray-400 text-sm md:text-base max-w-xl">
                        Toàn bộ các phim thuộc Vũ trụ Điện ảnh Marvel từ Giai đoạn 1 đến hiện tại
                    </p>
                    <div className="mt-4 px-4 py-1.5 rounded-full bg-white/10 text-white/70 text-sm">
                        {movies.length} phim
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pt-10">
                {PHASES.map(phase => {
                    const phaseMovies = movies.filter(m => m.year >= phase.years[0] && m.year <= phase.years[1]);
                    if (phaseMovies.length === 0) return null;
                    return (
                        <div key={phase.label} className="mb-12">
                            <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-6 bg-[#ED1D24] rounded-full" />
                                {phase.label}
                                <span className="text-sm text-gray-500 font-normal">
                                    ({phase.years[0]}–{phase.years[1] > 2026 ? 'nay' : phase.years[1]})
                                </span>
                                <span className="ml-auto text-xs text-gray-600">{phaseMovies.length} phim</span>
                            </h2>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                {phaseMovies.map(movie => (
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
