'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play, Calendar, Star, Clock, Info, ListPlus, Share2, Download, FolderOpen, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommentSection } from '@/components/CommentSection';
import { AddToListModal } from '@/components/AddToListModal';
import { useAuth } from '@/contexts/auth-context';
import { usePWA } from '@/hooks/usePWA';
import { API_URL } from '@/lib/config';
import { PWAAds } from '@/components/PWAAds';
import { getAuthToken } from '@/lib/api';

// ── Download Section Component ─────────────────────────────────────────────────
type DLFile = { filename?: string; size?: string; host: string; url: string };
type DLGroup = { episode: string; quality: string; files: DLFile[] };

const HOST_COLORS: Record<string, string> = {
    'pixeldrain.com': 'bg-blue-600',
    'gofile.io': 'bg-green-600',
    'send.cm': 'bg-purple-600',
    'send.now': 'bg-orange-600',
};

function DownloadSection({ slug, links }: { slug: string; links: DLGroup[] }) {
    const episodes = Array.from(new Set(links.map(g => g.episode)));
    const qualities = Array.from(new Set(links.map(g => g.quality)));

    const [selEpisode, setSelEpisode] = useState<string>('all');
    const [selQuality, setSelQuality] = useState<string>('all');
    const [selHost, setSelHost] = useState<string>('all');

    const filtered = links.filter(g =>
        (selEpisode === 'all' || g.episode === selEpisode) &&
        (selQuality === 'all' || g.quality === selQuality)
    );

    const allHosts = Array.from(new Set(filtered.flatMap(g => g.files.map(f => f.host))));

    const groups = filtered.map(g => ({
        ...g,
        files: g.files.filter(f => selHost === 'all' || f.host === selHost)
    })).filter(g => g.files.length > 0);

    const buildUrl = (g: DLGroup, idx: number) =>
        `${API_URL}/api/download/go?slug=${encodeURIComponent(slug)}&episode=${encodeURIComponent(g.episode)}&quality=${encodeURIComponent(g.quality)}&idx=${idx}`;

    return (
        <div>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Download className="w-6 h-6 text-primary" />
                Link Tải Phim
            </h3>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                {/* Episode filter */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-blue-400 tracking-widest">Filter by Episode</label>
                    <select
                        value={selEpisode}
                        onChange={e => setSelEpisode(e.target.value)}
                        className="bg-surface-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary min-w-40"
                    >
                        <option value="all">All Episodes</option>
                        {episodes.map(ep => <option key={ep} value={ep}>{ep}</option>)}
                    </select>
                </div>

                {/* Host filter */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-blue-400 tracking-widest">Filter by Host</label>
                    <select
                        value={selHost}
                        onChange={e => setSelHost(e.target.value)}
                        className="bg-surface-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary min-w-40"
                    >
                        <option value="all">All Hosts</option>
                        {allHosts.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                </div>

                {/* Quality filter */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-blue-400 tracking-widest">Filter by Quality</label>
                    <select
                        value={selQuality}
                        onChange={e => setSelQuality(e.target.value)}
                        className="bg-surface-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary min-w-40"
                    >
                        <option value="all">All Quality</option>
                        {qualities.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                </div>
            </div>

            {/* File Groups */}
            <div className="space-y-3">
                {groups.length === 0 && (
                    <p className="text-gray-500 text-sm">Không có link phù hợp.</p>
                )}
                {groups.map((g, gi) => (
                    <div key={gi} className="bg-surface-800 rounded-xl border border-white/10 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border-b border-white/10">
                            <FolderOpen className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-bold text-blue-300">{g.episode}</span>
                            <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">{g.quality}</span>
                        </div>
                        <div className="divide-y divide-white/5">
                            {g.files.map((f, fi) => (
                                <div key={fi} className="flex items-center gap-3 px-4 py-3">
                                    <Server className="w-4 h-4 text-gray-500 shrink-0" />
                                    <span className="text-sm text-gray-300 flex-1 truncate">
                                        {f.filename || `${g.episode} ${g.quality}`}
                                    </span>
                                    <span className={`text-[11px] px-2 py-0.5 rounded text-white font-medium shrink-0 ${HOST_COLORS[f.host] || 'bg-gray-600'}`}>
                                        {f.host}
                                    </span>
                                    {f.size && (
                                        <span className="text-xs text-gray-500 shrink-0">{f.size}</span>
                                    )}
                                    <a
                                        href={buildUrl(g, fi)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                                    >
                                        Download
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────

// Types
interface RelatedMovie {
    _id: string;
    name: string;
    slug: string;
    thumb_url: string;
    year: number;
    episode_current?: string;
}

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
    download_links?: {
        episode: string;
        quality: string;
        files: { filename?: string; size?: string; host: string; url: string }[];
    }[];
    progress?: {
        currentTime: number;
        duration: number;
        percentage: number;
        episodeSlug: string;
        episodeName: string;
        serverName?: string;
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
    const [relatedMovies, setRelatedMovies] = useState<RelatedMovie[]>([]);

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
                        if (Array.isArray(data.related) && data.related.length > 0) {
                            setRelatedMovies(data.related);
                        }
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
                    // Fetch related movies separately for SSR path
                    try {
                        const res = await fetch(`${API_URL}/api/movie/${slug}`, { credentials: 'include' });
                        const json = await res.json();
                        if (json.success && Array.isArray(json.related) && json.related.length > 0) {
                            setRelatedMovies(json.related);
                        }
                    } catch (e) { /* silent */ }
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
            if (movie.progress && movie.progress.episodeSlug) {
                const serverQuery = movie.progress.serverName ? `&server=${encodeURIComponent(movie.progress.serverName)}` : '';
                router.push(`/movie/${movie.slug}/watch?episode=${movie.progress.episodeSlug}${serverQuery}`);
            } else {
                router.push(`/movie/${movie.slug}/watch`);
            }
        }
    };

    const handleShare = async () => {
        if (!movie) return;
        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/movie/${movie.slug}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: `${movie.name} (${movie.year}) - Pchill`,
                    text: `Cùng xem phim ${movie.name} (${movie.year}) trên Pchill nhé! 🎬`,
                    url: url
                });
            } else {
                await navigator.clipboard.writeText(url);
                // Ideally trigger a toast notification here
                alert('Đã copy link phim vào clipboard!');
            }
        } catch (error) {
            console.error('Error sharing:', error);
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
                                    {movie.category?.some(c => c.id === 'phim-18' || c.name.includes('18')) && (
                                        <span className="px-3 py-1 bg-red-600 text-white font-bold text-xs rounded uppercase tracking-wider shadow-lg">
                                            18+
                                        </span>
                                    )}
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
                                <div className="flex flex-wrap gap-3 pt-4 justify-center md:justify-start">
                                    {/* XEM NGAY */}
                                    <Button
                                        onClick={handleWatchNow}
                                        className="group relative h-11 md:h-13 px-8 bg-primary hover:bg-gold-400 text-black text-sm md:text-base font-extrabold rounded-xl shadow-[0_0_24px_rgba(234,179,8,0.45)] hover:shadow-[0_0_40px_rgba(234,179,8,0.65)] transition-all duration-300 hover:scale-[1.04] active:scale-95 overflow-hidden"
                                    >
                                        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                                        <Play fill="black" className="mr-2 w-4 h-4 md:w-5 md:h-5 shrink-0" />
                                        {movie.progress && movie.progress.percentage > 0 && movie.progress.percentage < 100
                                            ? `XEM TIẾP · Tập ${movie.progress.episodeName}`
                                            : 'XEM NGAY'}
                                    </Button>

                                    {/* Yêu Thích */}
                                    <Button
                                        variant="outline"
                                        onClick={toggleFavorite}
                                        className={`h-11 md:h-13 px-5 border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white text-sm md:text-base font-semibold rounded-xl backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] active:scale-95 ${isFavorite ? '!border-primary/60 !text-primary bg-primary/10' : ''}`}
                                    >
                                        <Star className={`mr-2 w-4 h-4 md:w-5 md:h-5 shrink-0 transition-transform ${isFavorite ? 'fill-current scale-110' : ''}`} />
                                        {isFavorite ? 'Đã Thêm' : 'Yêu Thích'}
                                    </Button>

                                    {/* Lưu danh sách */}
                                    {user && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowListModal(true)}
                                            className="h-11 md:h-13 px-4 border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white rounded-xl backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] active:scale-95"
                                            title="Lưu vào danh sách"
                                        >
                                            <ListPlus className="w-4 h-4 md:w-5 md:h-5" />
                                        </Button>
                                    )}

                                    {/* Chia Sẻ */}
                                    <Button
                                        variant="outline"
                                        onClick={handleShare}
                                        className="h-11 md:h-13 px-5 border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white text-sm md:text-base font-semibold rounded-xl backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] active:scale-95"
                                        title="Chia sẻ phim"
                                    >
                                        <Share2 className="mr-2 w-4 h-4 md:w-5 md:h-5 shrink-0" />
                                        Chia Sẻ
                                    </Button>
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
                            {/* Ad — dưới tiêu đề chi tiết */}
                            <PWAAds variant="inline" />
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

                            {/* ── DOWNLOAD SECTION ── */}
                            {movie.download_links && movie.download_links.length > 0 && (
                                <DownloadSection slug={movie.slug} links={movie.download_links} />
                            )}

                            {/* Tags / Keywords placeholder */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Từ khóa</h4>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-white/5 px-3 py-1 rounded text-xs text-gray-400">{movie.name}</span>
                                    <span className="bg-white/5 px-3 py-1 rounded text-xs text-gray-400">{movie.origin_name}</span>
                                    {movie.category?.map((c, index) => (
                                        <Link
                                            key={`${c.id}-${index}`}
                                            href={`/the-loai/${c.id}`}
                                            className="bg-white/5 px-3 py-1 rounded text-xs text-gray-400 hover:text-primary hover:bg-white/10 transition-colors"
                                        >
                                            {c.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Related Movies - Phim liên quan */}
                            {relatedMovies.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <Play className="w-5 h-5 text-primary fill-current" />
                                        Phim liên quan
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {relatedMovies.map((rel) => (
                                            <Link
                                                key={rel._id}
                                                href={`/movie/${rel.slug}`}
                                                className="group flex gap-3 bg-white/5 rounded-lg overflow-hidden hover:bg-white/10 transition-colors border border-white/5"
                                            >
                                                <div className="w-16 h-20 shrink-0 overflow-hidden">
                                                    <img
                                                        src={rel.thumb_url}
                                                        alt={rel.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        loading="lazy"
                                                    />
                                                </div>
                                                <div className="flex-1 p-2 min-w-0">
                                                    <p className="text-white text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">{rel.name}</p>
                                                    <p className="text-gray-500 text-xs mt-1">{rel.year}</p>
                                                    {rel.episode_current && (
                                                        <p className="text-primary text-xs mt-0.5 truncate">{rel.episode_current}</p>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <PWAAds variant="inline2" />
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

            {
                movie && (
                    <AddToListModal
                        isOpen={showListModal}
                        onClose={() => setShowListModal(false)}
                        movieId={movie._id}
                    />
                )
            }
        </div >
    );
}
