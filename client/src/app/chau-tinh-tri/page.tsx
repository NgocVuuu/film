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

// Group by significant eras in his career
const ERAS = [
    { label: 'Thập niên 80 - 90 (Huyền Thoại Bắt Đầu)', years: [1988, 1999] },
    { label: 'Thập niên 2000 (Đỉnh Cao Kỹ Xảo)', years: [2000, 2009] },
    { label: 'Thập niên 2010 - Nay (Vai Trò Đạo Diễn)', years: [2010, 2030] }
];

export default function StephenChowPage() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/movies/stephenchow`, { credentials: 'include' })
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
                style={{ background: 'linear-gradient(135deg, #2c1a01 0%, #593101 50%, #c47600 100%)', minHeight: 220 }}>
                {/* Decorative blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-60px] left-[-60px] w-72 h-72 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #ffd000, transparent)' }} />
                    <div className="absolute bottom-[-40px] right-[-40px] w-56 h-56 rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, #ffb703, transparent)' }} />
                </div>
                <div className="relative container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
                    {/* Stephen Chow Logo text */}
                    <div className="inline-flex flex-col items-center justify-center bg-[#fb8500] border-2 border-white/30 px-6 py-3 rounded-lg mb-4 tracking-widest font-black text-white text-2xl md:text-4xl shadow-lg -rotate-2"
                        style={{ fontFamily: '"Arial Black", sans-serif' }}>
                        <span>STEPHEN</span>
                        <span className="text-yellow-200">CHOW</span>
                    </div>
                    <h1 className="text-white text-xl md:text-3xl font-bold mb-2">Tuyển Tập Hài Châu Tinh Trì</h1>
                    <p className="text-gray-300 text-sm md:text-base max-w-xl">
                        Toàn bộ các siêu phẩm hài kinh điển làm nên tên tuổi Vua Hài Kịch Hong Kong
                    </p>
                    <div className="mt-4 px-4 py-1.5 rounded-full bg-white/10 text-white/70 text-sm">
                        {movies.length} phim
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pt-10">
                {ERAS.map(era => {
                    const eraMovies = movies.filter(m => m.year >= era.years[0] && m.year <= era.years[1]);
                    if (eraMovies.length === 0) return null;
                    return (
                        <div key={era.label} className="mb-12">
                            <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-6 bg-[#fb8500] rounded-full" />
                                {era.label}
                                <span className="text-sm text-gray-500 font-normal">
                                    ({era.years[0]}–{era.years[1] > 2026 ? 'nay' : era.years[1]})
                                </span>
                                <span className="ml-auto text-xs text-gray-600">{eraMovies.length} phim</span>
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {eraMovies.map(movie => (
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
