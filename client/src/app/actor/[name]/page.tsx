'use client';
import { useEffect, useState } from 'react';
import { use } from 'react';
import { MovieCard } from '@/components/MovieCard';
import { User, Film } from 'lucide-react';
import { API_URL } from '@/lib/config';

export const runtime = 'edge';

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

interface ActorInfo {
    name: string;
    biography: string;
    birthday: string;
    place_of_birth: string;
    profile_path: string;
    known_for_department: string;
}

interface ActorPageProps {
    params: Promise<{ name: string }>;
}

export default function ActorPage({ params }: ActorPageProps) {
    const { name } = use(params);
    const actorName = decodeURIComponent(name);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [actorInfo, setActorInfo] = useState<ActorInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!actorName) return;
        setLoading(true);

        fetch(`${API_URL}/api/actor/${encodeURIComponent(actorName)}`, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setMovies(data.movies);
                    setActorInfo(data.actor);
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
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8 border-b border-white/10 pb-8 bg-surface-900/40 p-6 md:p-8 rounded-3xl border border-white/5">
                    <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 mx-auto md:mx-0 bg-surface-800 rounded-full flex items-center justify-center border-4 border-surface-900 shadow-xl overflow-hidden ring-2 ring-primary/20">
                        {actorInfo?.profile_path ? (
                            <img src={`https://image.tmdb.org/t/p/w500${actorInfo.profile_path}`} alt={actorName} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-16 h-16 text-primary/50" />
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left flex flex-col justify-center">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            {actorName}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                            <p className="text-gray-400 flex items-center gap-2 text-sm bg-white/5 px-3 py-1.5 rounded-full">
                                <Film className="w-4 h-4 text-primary" />
                                Tham gia {movies.length} phim
                            </p>
                            {actorInfo?.known_for_department && (
                                <p className="text-gray-400 flex items-center gap-2 text-sm bg-white/5 px-3 py-1.5 rounded-full">
                                    <strong className="text-gray-500">Vai trò:</strong> {actorInfo.known_for_department === 'Acting' ? 'Diễn viên' : actorInfo.known_for_department}
                                </p>
                            )}
                        </div>
                        {actorInfo && (
                            <div className="space-y-2 text-sm text-gray-300 max-w-3xl">
                                <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 mb-4">
                                    {actorInfo.birthday && <p><strong className="text-gray-500">Ngày sinh:</strong> <span className="text-white">{actorInfo.birthday}</span></p>}
                                    {actorInfo.place_of_birth && <p><strong className="text-gray-500">Nơi sinh:</strong> <span className="text-white">{actorInfo.place_of_birth}</span></p>}
                                </div>
                                {actorInfo.biography && (
                                    <div className="mt-4 pt-4 border-t border-white/5 text-left">
                                        <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Tiểu sử</h3>
                                        <p className="text-gray-400 leading-relaxed text-sm line-clamp-6 hover:line-clamp-none transition-all cursor-pointer" title="Nhấn để xem đầy đủ">{actorInfo.biography}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-surface-800 rounded-lg aspect-2/3"></div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
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
