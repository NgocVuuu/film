'use client';
import { useEffect, useState } from 'react';
import { use } from 'react';
import { MovieCard } from '@/components/MovieCard';
import { User, Film } from 'lucide-react';
import { API_URL } from '@/lib/config';

export const runtime = 'edge';

interface ActorPageProps {
    params: Promise<{ name: string }>;
}

export default function ActorPage({ params }: ActorPageProps) {
    const { name } = use(params);
    const actorName = decodeURIComponent(name);
    const [movies, setMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!actorName) return;
        setLoading(true);

        fetch(`${API_URL}/api/movies?actor=${encodeURIComponent(actorName)}`, { credentials: 'include' })
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
    }, [actorName]);

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-8 pb-20">
            <div className="container mx-auto px-4">
                <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                    <div className="w-20 h-20 bg-surface-800 rounded-full flex items-center justify-center border-2 border-primary shadow-lg shadow-primary/20">
                        <User className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            Diễn viên: <span className="text-gold-gradient">{actorName}</span>
                        </h1>
                        <p className="text-gray-400 mt-1 flex items-center gap-2">
                            <Film className="w-4 h-4" />
                            Đã tham gia {movies.length} phim
                        </p>
                    </div>
                </div>

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
                            <div className="text-center text-gray-500 py-20 bg-surface-900/50 rounded-xl border border-dashed border-white/10">
                                <p className="text-lg">Chưa tìm thấy phim nào của diễn viên này.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
