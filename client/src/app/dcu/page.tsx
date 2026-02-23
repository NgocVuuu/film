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

// DCU Phases (rough estimation)
const PHASES = [
    { label: 'Giai đoạn 1 (Ra đời)', years: [2013, 2017] },
    { label: 'Giai đoạn 2 (Mở rộng)', years: [2018, 2021] },
    { label: 'Giai đoạn 3 (Khởi động lại)', years: [2022, 2025] }
];

export default function DCUPage() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/movies/dcu`, { credentials: 'include' })
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
                style={{ background: 'linear-gradient(135deg, #020b1a 0%, #0d1b2a 50%, #1b263b 100%)', minHeight: 220 }}>
                {/* Decorative blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-60px] left-[-60px] w-72 h-72 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #4ba3e3, transparent)' }} />
                    <div className="absolute bottom-[-40px] right-[-40px] w-56 h-56 rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, #778da9, transparent)' }} />
                </div>
                <div className="relative container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
                    {/* DC Logo text */}
                    <div className="inline-block bg-[#005b96] border border-white/20 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full mb-4 tracking-wider font-black text-white text-3xl md:text-5xl"
                        style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>
                        DC
                    </div>
                    <h1 className="text-white text-xl md:text-3xl font-bold mb-2">Vũ Trụ Điện Ảnh DC (DCEU)</h1>
                    <p className="text-gray-400 text-sm md:text-base max-w-xl">
                        Toàn bộ các phim bom tấn thuộc Vũ trụ Mở rộng DC từ Man of Steel đến nay
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
                                <span className="w-1 h-6 bg-[#005b96] rounded-full" />
                                {phase.label}
                                <span className="text-sm text-gray-500 font-normal">
                                    ({phase.years[0]}–{phase.years[1] > 2026 ? 'nay' : phase.years[1]})
                                </span>
                                <span className="ml-auto text-xs text-gray-600">{phaseMovies.length} phim</span>
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
