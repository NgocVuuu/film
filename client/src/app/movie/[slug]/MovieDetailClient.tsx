'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play, Calendar, Star, Clock, Info, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommentSection } from '@/components/CommentSection';
import { AddToListModal } from '@/components/AddToListModal';
import { useAuth } from '@/contexts/auth-context';
import { usePWA } from '@/hooks/usePWA';
import { API_URL } from '@/lib/config';
import { getAuthToken } from '@/lib/api';

// Types
interface Episode {
    server_name: string;
    server_data: {
        name: string;
        slug: string;
        link_m3u8: string;
        link_embed: string;
    }[];
}

interface MovieDetail {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    content: string;
    thumb_url: string;
    poster_url: string;
    year: number;
    episodes: Episode[];
    status: string;
    type: string;
    actor?: string[];
    director?: string[];
    category?: { id: string; name: string }[];
    country?: { id: string; name: string }[];
    quality?: string;
    lang?: string;
    time?: string;
    rating_average?: number;
    rating_count?: number;
    progress?: {
        currentTime: number;
        duration: number;
        percentage: number;
        episodeSlug: string;
        episodeName: string;
    };
}

export default function MovieDetailClient({ initialMovie }: { initialMovie: MovieDetail | null }) {
    const { slug } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { isPWA } = usePWA();
    const [movie, setMovie] = useState<MovieDetail | null>(initialMovie);
    const [loading, setLoading] = useState(!initialMovie);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showListModal, setShowListModal] = useState(false);

    useEffect(() => {
        // If we have initial data (from server), we only need to sync favorites and history
        if (initialMovie && !movie) {
            setMovie(initialMovie);
            setLoading(false);
        }

        const syncUserData = async () => {
            if (!slug) return;
            if (!movie && !initialMovie) {
                // Fetch movie data if not provided
                try {
                    const res = await fetch(`${API_URL}/api/movie/${slug}`, { credentials: 'include' });
                    const data = await res.json();
                    if (data.success) {
                        setMovie(data.data);
                        processUserData(data.data);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            } else {
                const data = movie || initialMovie;
                if (data) {
                    processUserData(data);
                }
            }
        };

        syncUserData();
    }, [slug, user, initialMovie]);

    const processUserData = async (movieData: MovieDetail) => {
        if (!movieData) return;

        addToHistory(movieData);

        if (user) {
            try {
                const token = getAuthToken();
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const favRes = await fetch(`${API_URL}/api/favorites/${movieData.slug}/check`, { credentials: 'include', headers });
                const favData = await favRes.json();
                setIsFavorite(favData.isFavorite);
            } catch (e) {
                console.error('Error checking favorite:', e);
            }
        } else {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            const isFav = favorites.some((fav: { slug: string }) => fav.slug === movieData.slug);
            setIsFavorite(isFav);
        }
    }

    const addToHistory = (movieData: MovieDetail) => {
        try {
            const history = JSON.parse(localStorage.getItem('history') || '[]');
            const newHistory = [
                {
                    _id: movieData._id,
                    name: movieData.name,
                    origin_name: movieData.origin_name,
                    slug: movieData.slug,
                    thumb_url: movieData.thumb_url,
                    year: movieData.year,
                    viewedAt: new Date().toISOString()
                },
                ...history.filter((h: { slug: string }) => h.slug !== movieData.slug)
            ].slice(0, 50);
            localStorage.setItem('history', JSON.stringify(newHistory));
        } catch (error) {
            console.error('Error saving history:', error);
        }
    };

    const toggleFavorite = async () => {
        if (!movie) return;

        if (user) {
            // API
            try {
                const token = getAuthToken();
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                if (isFavorite) {
                    await fetch(`${API_URL}/api/favorites/${movie.slug}`, { method: 'DELETE', credentials: 'include', headers });
                    setIsFavorite(false);
                } else {
                    headers['Content-Type'] = 'application/json';
                    await fetch(`${API_URL}/api/favorites`, {
                        method: 'POST',
                        headers,
                        credentials: 'include',
                        body: JSON.stringify({ slug: movie.slug })
                    });
                    setIsFavorite(true);
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            // LocalStorage
            try {
                const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
                if (isFavorite) {
                    const newFavs = favorites.filter((fav: { slug: string }) => fav.slug !== movie.slug);
                    localStorage.setItem('favorites', JSON.stringify(newFavs));
                    setIsFavorite(false);
                } else {
                    const newFav = {
                        _id: movie._id,
                        name: movie.name,
                        origin_name: movie.origin_name,
                        slug: movie.slug,
                        thumb_url: movie.thumb_url,
                        year: movie.year,
                        addedAt: new Date().toISOString()
                    };
                    localStorage.setItem('favorites', JSON.stringify([newFav, ...favorites]));
                    setIsFavorite(true);
                }
            } catch (error) {
                console.error('Error saving favorites:', error);
            }
        }
    };

    const handleWatchNow = () => {
        if (movie) {
            // If has progress, maybe we want to direct to specific episode?
            // For now, let's just go to watch page, it should handle resume or default to first ep
            // But if we have valid episodeSlug in progress, we can append it? 
            // The current routing seems to be /movie/:slug/watch. 
            // If the watch page supports query param or segments like /watch?ep=slug, that would be better.
            // Assuming default behavior for now.
            router.push(`/movie/${movie.slug}/watch`);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-deep-black text-primary animate-pulse">Đang tải dữ liệu phim...</div>;
    if (!movie && !loading) return <div className="min-h-screen flex items-center justify-center bg-deep-black text-red-500">Khong tim thay phim/Not Found</div>;
    if (!movie) return null;

    return (
        <div className={`min-h-screen bg-deep-black text-white font-sans ${isPWA ? 'mt-0' : '-mt-16'}`}>

            {/* FULL SCREEN HERO SECTION */}
            <div className={`relative w-full h-[70vh] lg:h-[80vh] ${isPWA ? 'pt-[env(safe-area-inset-top)]' : ''}`}>

                {/* Backdrop Image */}
                <div className="absolute inset-0">
                    <img
                        src={movie.poster_url || movie.thumb_url}
                        alt={movie.name}
                        className="w-full h-full object-cover"
                    />
                    {/* Gradient Overlays for readability */}
                    <div className="absolute inset-0 bg-linear-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
                    <div className="absolute inset-0 bg-linear-to-r from-[#050505]/90 via-[#050505]/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-linear-to-b from-black/80 via-transparent to-transparent h-32"></div>
                </div>

                {/* Content Container */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="container mx-auto px-4 md:px-8 mt-16 md:mt-24">
                        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-end">

                            {/* Left: Poster (Vertical) */}
                            <div className="hidden md:block shrink-0 w-56 md:w-64 lg:w-72 aspect-2/3 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 relative group">
                                <img
                                    src={movie.poster_url || movie.thumb_url}
                                    alt={movie.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                {/* Play Overlay on Poster */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={handleWatchNow}>
                                    <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-110 transition-transform duration-300 delay-100">
                                        <Play fill="black" className="w-6 h-6 text-black ml-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Right: Info */}
                            <div className="flex-1 max-w-4xl space-y-4 md:space-y-6 animate-fade-in-up text-center md:text-left">

                                {/* Badges */}
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                    <span className="px-3 py-1 bg-primary text-black font-bold text-xs rounded uppercase tracking-wider shadow-glow">
                                        {movie.quality || 'HD'}
                                    </span>
                                    <span className="px-3 py-1 bg-white/20 text-white font-bold text-xs rounded uppercase tracking-wider backdrop-blur-sm border border-white/10">
                                        {movie.lang || 'Vietsub'}
                                    </span>
                                    <span className="px-3 py-1 bg-red-600 text-white font-bold text-xs rounded uppercase tracking-wider shadow-lg">
                                        18+
                                    </span>
                                </div>

                                {/* Title */}
                                <div>
                                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold font-heading text-shadow-xl leading-tight mb-2">
                                        {movie.name}
                                    </h1>
                                    <h2 className="text-base md:text-xl text-gray-300 font-light tracking-wide">
                                        {movie.origin_name}
                                    </h2>
                                </div>

                                {/* Meta Info Line */}
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-gray-300 text-sm md:text-base">
                                    <span className="flex items-center gap-2 text-yellow-500 font-bold whitespace-nowrap">
                                        <Star className="w-5 h-5 fill-current" />
                                        {movie.rating_average ? movie.rating_average.toFixed(1) : 'N/A'}
                                        <span className="text-gray-400 text-xs font-normal">({movie.rating_count || 0})</span>
                                    </span>
                                    <span className="flex items-center gap-2 whitespace-nowrap"><Calendar className="w-5 h-5" /> {movie.year}</span>
                                    <span className="flex items-center gap-2 whitespace-nowrap"><Clock className="w-5 h-5" /> {movie.time || 'N/A'}</span>
                                    <span className="px-2 py-0.5 border border-white/20 rounded text-xs whitespace-nowrap">{movie.type === 'series' ? 'Phim Bộ' : 'Phim Lẻ'}</span>
                                </div>

                                {/* Genre & Country */}
                                <div className="flex flex-wrap gap-2 text-sm text-gray-400 justify-center md:justify-start">
                                    <span>{movie.country?.map(c => c.name).join(', ')}</span>
                                    <span className="px-2 text-white/20">•</span>
                                    <span>{movie.category?.map((c, index) => (
                                        <span key={`${c.id}-${index}`}>{c.name}{index < (movie.category?.length || 0) - 1 ? ', ' : ''}</span>
                                    ))}</span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-4 pt-4 justify-center md:justify-start">
                                    <Button
                                        onClick={handleWatchNow}
                                        className="h-10 md:h-12 px-6 bg-primary hover:bg-gold-400 text-black text-base md:text-lg font-bold rounded-full shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_50px_rgba(255,215,0,0.5)] transition-all transform hover:scale-105"
                                    >
                                        <Play fill="black" className="mr-2 w-5 h-5 md:w-6 md:h-6" />
                                        {movie.progress && movie.progress.percentage > 0 && movie.progress.percentage < 100
                                            ? `XEM TIẾP (Tập ${movie.progress.episodeName})`
                                            : 'XEM NGAY'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={toggleFavorite}
                                        className={`h-10 md:h-12 px-6 border-2 border-white/20 hover:bg-white/10 text-white text-base md:text-lg font-bold rounded-full backdrop-blur-sm transition-all ${isFavorite ? 'border-primary text-primary' : ''}`}
                                    >
                                        <Star className={`mr-2 w-5 h-5 md:w-6 md:h-6 ${isFavorite ? 'fill-current' : ''}`} />
                                        {isFavorite ? 'Đã Thêm' : 'Yêu Thích'}
                                    </Button>

                                    {user && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowListModal(true)}
                                            className="h-10 md:h-12 px-6 border-2 border-white/20 hover:bg-white/10 text-white text-base md:text-lg font-bold rounded-full backdrop-blur-sm transition-all"
                                            title="Lưu vào danh sách"
                                        >
                                            <ListPlus className="w-5 h-5 md:w-6 md:h-6" />
                                        </Button>
                                    )}
                                </div>

                                {/* Cast Preview (Mobile/Tablet only maybe? Keeping simple) */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ADDITIONAL DETAILS SECTION (Below Fold) */}
            <div className="bg-[#0a0a0a] py-16 border-t border-white/5">
                <div className="container mx-auto px-4 md:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                        {/* Film Synopsis Full */}
                        <div className="lg:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                    <Info className="w-6 h-6 text-primary" />
                                    Nội dung chi tiết
                                </h3>
                                <div
                                    className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed text-justify"
                                    dangerouslySetInnerHTML={{ __html: movie.content }}
                                />
                            </div>

                            {/* Tags / Keywords placeholder */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Từ khóa</h4>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-white/5 px-3 py-1 rounded text-xs text-gray-400">{movie.name}</span>
                                    <span className="bg-white/5 px-3 py-1 rounded text-xs text-gray-400">{movie.origin_name}</span>
                                    {movie.category?.map((c, index) => (
                                        <span key={`${c.id}-${index}`} className="bg-white/5 px-3 py-1 rounded text-xs text-gray-400">{c.name}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-12">
                                <CommentSection movieSlug={slug as string} />
                            </div>
                        </div>

                        {/* Sidebar Info */}
                        <div className="space-y-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                                <h3 className="text-base font-bold text-white mb-3">Thông tin phim</h3>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                                        <dt className="text-gray-400">Trạng thái</dt>
                                        <dd className="text-primary font-bold">{movie.status === 'completed' ? 'Hoàn tất' : 'Đang chiếu'}</dd>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                                        <dt className="text-gray-400">Số tập</dt>
                                        <dd className="text-white">{movie.episodes?.[0]?.server_data?.length || '?'}</dd>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                                        <dt className="text-gray-400">Thời lượng</dt>
                                        <dd className="text-white">{movie.time}</dd>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                                        <dt className="text-gray-400">Năm phát hành</dt>
                                        <dd className="text-white">{movie.year}</dd>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                                        <dt className="text-gray-400">Chất lượng</dt>
                                        <dd className="text-white">{movie.quality}</dd>
                                    </div>
                                    <div className="flex justify-between pt-1.5">
                                        <dt className="text-gray-400">Ngôn ngữ</dt>
                                        <dd className="text-white">{movie.lang}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                                <h3 className="text-base font-bold text-white mb-3">Đạo diễn</h3>
                                <div className="text-gray-300 text-sm">
                                    {movie.director?.join(', ') || 'Đang cập nhật'}
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                                <h3 className="text-base font-bold text-white mb-3">Diễn viên</h3>
                                <div className="text-gray-300 text-sm">
                                    {movie.actor?.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {movie.actor.map((actor, idx) => (
                                                <Link
                                                    key={idx}
                                                    href={`/actor/${encodeURIComponent(actor)}`}
                                                    className="font-medium hover:text-primary transition-colors hover:underline"
                                                >
                                                    {actor}{idx < movie.actor!.length - 1 ? ',' : ''}
                                                </Link>
                                            ))}
                                        </div>
                                    ) : 'Đang cập nhật'}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {movie && (
                <AddToListModal
                    isOpen={showListModal}
                    onClose={() => setShowListModal(false)}
                    movieId={movie._id}
                />
            )}
        </div>
    );
}
