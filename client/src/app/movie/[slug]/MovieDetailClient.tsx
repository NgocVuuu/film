'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play, Calendar, Star, Clock, Info, ListPlus, Share2, Download, FolderOpen, Server, MessageCircle, ChevronDown, User, Heart, Users, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MovieGallery } from '@/components/movie/MovieGallery';
import { MovieOst } from '@/components/movie/MovieOst';
import { CommentSection } from '@/components/CommentSection';
import { AddToListModal } from '@/components/AddToListModal';
import { BottomSheet } from '@/components/BottomSheet';
import { useAuth } from '@/contexts/auth-context';
import { usePWA } from '@/hooks/usePWA';
import { API_URL } from '@/lib/config';
import { PWAAds } from '@/components/PWAAds';
import { getAuthToken, customFetch } from '@/lib/api';
import toast from 'react-hot-toast';
import { MovieCard } from '@/components/MovieCard';
import { cn } from '@/lib/utils';
import { encodeServerForUrl } from '@/lib/serverUrl';

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

// ── Episode Selector Component ───────────────────────────────────────────────
function EpisodeSelector({ movie, router, isMobile = false }: { movie: MovieDetail, router: any, isMobile?: boolean }) {
    const [selectedServer, setSelectedServer] = useState(0);

    if (!movie.episodes || movie.episodes.length === 0) return null;
    
    const visibleServers = movie.episodes.filter(s => !s.isHidden && s.server_data && s.server_data.length > 0);
    if (visibleServers.length === 0) return null;

    const getCleanServerName = (rawName: string) => {
        if (!rawName) return '';
        const lowerName = rawName.toLowerCase();
        if (lowerName.includes('abyss') || lowerName.includes('seekstreaming')) return 'VIP 1';
        if (lowerName.includes('play4me')) return 'VIP 2';

        let name = '';
        if (lowerName.startsWith('kk') || lowerName.includes('server 1')) name = 'Server 1';
        else if (lowerName.startsWith('op') || lowerName.includes('server 2')) name = 'Server 2';
        else name = 'Server Dự Phòng';

        if (lowerName.includes('vietsub')) name += ' - Vietsub';
        else if (lowerName.includes('thuyết minh') || lowerName.includes('thuyet minh')) name += ' - Thuyết Minh';
        else if (lowerName.includes('lồng tiếng') || lowerName.includes('long tieng')) name += ' - Lồng Tiếng';
        else if (lowerName.includes('engsub')) name += ' - Engsub';

        return name;
    };

    // Sắp xếp server: Server 1 -> Server 2 -> VIP 1 -> VIP 2 -> Khác
    const sortedServers = [...visibleServers].sort((a, b) => {
        const nameA = getCleanServerName(a.server_name);
        const nameB = getCleanServerName(b.server_name);
        
        const getPriority = (name: string) => {
            if (name.includes('Server 1')) return 1;
            if (name.includes('Server 2')) return 2;
            if (name.includes('VIP 1')) return 3;
            if (name.includes('VIP 2')) return 4;
            return 5;
        };

        const prioA = getPriority(nameA);
        const prioB = getPriority(nameB);

        if (prioA !== prioB) return prioA - prioB;
        return nameA.localeCompare(nameB);
    });

    const currentServer = sortedServers[selectedServer] || sortedServers[0];

    const handleEpisodeClick = (epSlug: string) => {
        const serverQuery = `&server=${encodeServerForUrl(currentServer.server_name)}`;
        router.push(`/movie/${movie.slug}/watch?episode=${epSlug}${serverQuery}`);
    };

    return (
        <div className="mt-4 mb-2 space-y-3 w-full">
            {sortedServers.length > 1 && (
                <div className={cn("gap-2.5", isMobile ? "grid grid-cols-3" : "flex flex-wrap")}>
                    {sortedServers.map((s, idx) => {
                        const cleanName = getCleanServerName(s.server_name);
                        const isVip = cleanName.includes('VIP');
                        const parts = cleanName.split(' - ');
                        const mainName = parts[0];
                        const subName = parts[1] || '';
                        
                        let quality = movie.quality || 'HD';
                        if (mainName === 'VIP 1') quality = 'FHD';
                        else if (mainName === 'VIP 2') quality = 'FHD';
                        
                        const isSelected = selectedServer === idx;

                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedServer(idx)}
                                className={cn(
                                    "relative overflow-hidden rounded-xl transition-all duration-300 text-left group border",
                                    isMobile ? "w-full aspect-[4/3] sm:aspect-[16/10]" : "w-[130px] md:w-[150px] aspect-[16/10]",
                                    isSelected 
                                        ? (isVip ? "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-[1.03]" : "border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] scale-[1.03]") 
                                        : "border-white/10 hover:border-white/30 hover:scale-[1.03]"
                                )}
                            >
                                <div className="absolute inset-0">
                                    <img src={movie.thumb_url || movie.poster_url} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                                    <div className={cn(
                                        "absolute inset-0",
                                        isSelected 
                                            ? (isVip ? "bg-gradient-to-t from-yellow-900/90 to-black/20" : "bg-gradient-to-t from-primary/80 via-primary/20 to-black/20")
                                            : "bg-gradient-to-t from-black/90 via-black/50 to-black/10"
                                    )} />
                                </div>
                                
                                <div className="absolute inset-0 p-2.5 flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-bold text-white border border-white/10">
                                            {quality}
                                        </span>
                                        {isVip && <Crown className={cn("w-3.5 h-3.5 drop-shadow-md", isSelected ? "text-yellow-400" : "text-yellow-500")} />}
                                    </div>
                                    
                                    <div>
                                        <div className={cn("text-xs md:text-sm font-black truncate drop-shadow-md", isSelected ? (isVip ? "text-yellow-400" : "text-white") : "text-gray-200")}>
                                            {mainName}
                                        </div>
                                        {subName && (
                                            <div className={cn("text-[9px] md:text-[10px] font-bold truncate uppercase mt-0.5 drop-shadow-md", isSelected ? "text-gray-200" : "text-gray-400")}>
                                                {subName}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
            
            <div className="bg-surface-800/50 backdrop-blur-sm rounded-xl border border-white/5 p-3 md:p-4 text-left">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Play className="w-4 h-4 text-primary" />
                        Chọn tập phim
                    </h3>
                    <span className="text-xs text-gray-400">{currentServer.server_data.length} tập</span>
                </div>
                
                {movie.type === 'single' ? (
                    <button 
                        onClick={() => handleEpisodeClick(currentServer.server_data[0]?.slug || '')}
                        className="w-full md:w-auto px-8 py-3 bg-white/10 hover:bg-primary hover:text-black text-white font-bold rounded-lg transition-all"
                    >
                        TẬP FULL
                    </button>
                ) : (
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                        {currentServer.server_data.map((ep, i) => (
                            <button
                                key={i}
                                onClick={() => handleEpisodeClick(ep.slug)}
                                className="aspect-square flex items-center justify-center text-[13px] font-bold bg-white/5 hover:bg-primary hover:text-black text-gray-300 rounded-lg transition-all border border-white/5"
                                title={ep.name}
                            >
                                {ep.name.replace(/Tập\s*/i, '').replace(/Tap\s*/i, '').trim() || (i + 1)}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────

// Types
type RelatedMovie = {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    year: number;
    episode_current?: string;
    lang?: string;
};
interface Episode {
    server_name: string;
    isHidden?: boolean;
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
    cast?: {
        tmdb_id: number;
        name: string;
        character: string;
        profile_path: string;
    }[];
    director?: string[];
    category?: { id: string; name: string }[];
    country?: { id: string; name: string }[];
    quality?: string;
    lang?: string;
    time?: string;
    trailer_url?: string;
    ost_id?: string;
    ost_source?: string;
    tmdb_images?: string[];
    rating_average?: number;
    rating_count?: number;
    fire_count?: number;
    trash_count?: number;
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

const getEmbedUrl = (url?: string) => {
    if (!url) return '';
    // Xử lý link youtube dạng /watch?v=
    if (url.includes('youtube.com/watch?v=')) {
        const videoId = new URL(url).searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    // Xử lý link youtu.be
    if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    return url;
};

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

    // Reactions
    const [fireCount, setFireCount] = useState(initialMovie?.fire_count || 0);
    const [trashCount, setTrashCount] = useState(initialMovie?.trash_count || 0);
    const [userReaction, setUserReaction] = useState<'fire' | 'trash' | null>(null);

    // Mobile States
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isListOpen, setIsListOpen] = useState(false);
    const [isRateOpen, setIsRateOpen] = useState(false);
    const [isCommentOpen, setIsCommentOpen] = useState(false);
    const [commentSubTab, setCommentSubTab] = useState<'comment' | 'rating'>('comment');
    const [activeTab, setActiveTab] = useState<'servers' | 'actors' | 'recommendations'>('servers');
    const [userRating, setUserRating] = useState(0);
    const [ratingHover, setRatingHover] = useState(0);
    const [ratingComment, setRatingComment] = useState('');

    useEffect(() => {
        // If we have initial data (from server), we only need to sync favorites and history
        if (initialMovie && !movie) {
            setMovie(initialMovie);
            setFireCount(initialMovie.fire_count || 0);
            setTrashCount(initialMovie.trash_count || 0);
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
                        setFireCount(data.data.fire_count || 0);
                        setTrashCount(data.data.trash_count || 0);
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

                const reactionRes = await fetch(`${API_URL}/api/movies/${movieData.slug}/reaction`, { credentials: 'include', headers });
                const reactionData = await reactionRes.json();
                if (reactionData.success) {
                    setUserReaction(reactionData.data);
                }
            } catch (e) {
                console.error('Error fetching user data:', e);
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
                const serverQuery = movie.progress.serverName ? `&server=${encodeServerForUrl(movie.progress.serverName)}` : '';
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

    const handleRateSubmit = async () => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để đánh giá');
            return;
        }
        if (userRating === 0) {
            toast.error('Vui lòng chọn mức đánh giá');
            return;
        }

        try {
            const token = getAuthToken();
            const res = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    movieSlug: movie?.slug,
                    rating: userRating, 
                    content: ratingComment 
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Cảm ơn bạn đã đánh giá!');
                setIsRateOpen(false);
                // Optionally refresh movie data to show new average
            } else {
                toast.error(data.message);
            }
        } catch (e) {
            toast.error('Lỗi khi gửi đánh giá');
        }
    };

    const handleReaction = async (type: 'fire' | 'trash') => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để chê/khen phim');
            return;
        }
        if (!movie) return;

        const newReaction = userReaction === type ? null : type;
        
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_URL}/api/movies/${movie.slug}/react`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ type: newReaction })
            });
            const data = await res.json();
            if (data.success) {
                setFireCount(data.fire_count);
                setTrashCount(data.trash_count);
                setUserReaction(data.userReaction);
            }
        } catch (e) {
            toast.error('Lỗi khi vote phim');
        }
    };

    const handleRequest4k = async () => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để sử dụng tính năng này');
            return;
        }
        if (user.role !== 'admin' && user.subscription?.tier !== 'vip' && user.subscription?.tier !== 'premium') {
            toast.error('Chỉ tài khoản Premium hoặc VIP mới được yêu cầu phim');
            return;
        }
        try {
            const res = await customFetch(`/api/movies/${movie?.slug}/request-4k`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message || 'Gửi yêu cầu Server VIP thành công!');
            } else {
                toast.error(data.message || 'Lỗi khi gửi yêu cầu');
            }
        } catch (e) {
            toast.error('Lỗi kết nối server');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-deep-black text-primary animate-pulse">Đang tải dữ liệu phim...</div>;
    if (!movie && !loading) return <div className="min-h-screen flex items-center justify-center bg-deep-black text-red-500">Khong tim thay phim/Not Found</div>;
    if (!movie) return null;

    return (
        <div className="min-h-screen bg-deep-black text-white font-sans">
            {/* ── MOBILE VIEW ──────────────────────────────────────────────────────── */}
            <div className={cn("block md:hidden bg-black", !isPWA ? "-mt-[3.5rem]" : "pt-[env(safe-area-inset-top)]")}>
                {/* 1. Backdrop Image / Trailer (Landscape) */}
                {movie.trailer_url ? (
                    <div className="relative w-full aspect-video overflow-hidden bg-black">
                        <iframe 
                            src={getEmbedUrl(movie.trailer_url)} 
                            className="w-full h-full object-cover border-0" 
                            allowFullScreen 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            loading="lazy"
                        ></iframe>
                    </div>
                ) : (
                    <div className="relative w-full aspect-video overflow-hidden">
                        <img
                            src={movie.thumb_url}
                            alt={movie.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-deep-black via-transparent to-transparent" />
                    </div>
                )}

                <div className="px-4 space-y-5 relative z-10">
                    {/* 2. Slim Watch Button */}
                    <div className="pt-2">
                        <Button
                            onClick={handleWatchNow}
                            className="w-full h-11 bg-gold-gradient hover:brightness-110 text-black font-extrabold rounded-xl shadow-glow relative overflow-hidden active:scale-95 transition-all text-xs border-none"
                        >
                            <Play fill="black" className="w-4 h-4 mr-2" />
                            {movie.progress && movie.progress.percentage > 0 && movie.progress.percentage < 100
                                ? `TẬP ${movie.progress.episodeName} · ${movie.progress.percentage}%`
                                : 'XEM PHIM NGAY'}
                        </Button>
                    </div>

                    {/* 3. Title & Core Meta */}
                    <div className="space-y-1">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 pt-4">
                                <h1 className="text-xl font-semibold tracking-tight leading-tight">{movie.name}</h1>
                                <p className="text-gray-400 text-[13px] font-normal">{movie.origin_name}</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-medium text-gray-400">
                             <div className="flex items-center gap-1 text-yellow-500/90">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="font-semibold">{movie.rating_average?.toFixed(1) || 'N/A'}</span>
                             </div>
                             <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{movie.quality}</span>
                             <span>{movie.year}</span>
                             <span>{movie.time}</span>
                             {movie.type === 'series' && <span className="text-primary/90 uppercase tracking-wider">{movie.episodes?.[0]?.server_data?.length || '?'} TẬP</span>}
                        </div>
                    </div>

                    {/* 4. Genres */}
                    <div className="flex flex-wrap gap-1.5">
                        {movie.category?.map((c, i) => (
                            <Link 
                                key={i} 
                                href={`/the-loai/${c.id}`}
                                className="px-2.5 py-1 bg-surface-800/50 rounded-full text-[10px] font-medium text-gray-400 border border-white/5 whitespace-nowrap"
                            >
                                {c.name}
                            </Link>
                        ))}
                    </div>

                    {/* 5. Condensed Description */}
                    <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 relative">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="text-[13px] text-gray-400 line-clamp-2 leading-relaxed font-normal" dangerouslySetInnerHTML={{ __html: movie.content }} />
                            </div>
                            <button 
                                onClick={() => setIsDetailsOpen(true)}
                                className="shrink-0 flex items-center gap-1 text-[9px] font-semibold text-primary group bg-primary/10 px-2.5 py-1.5 rounded-full"
                            >
                                CHI TIẾT
                                <ChevronDown className="w-3 h-3 group-active:translate-y-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* 6. Interaction Bar (5 Buttons) */}
                    <div className="flex items-center justify-between px-1">
                        <button 
                            onClick={toggleFavorite}
                            className="flex flex-col items-center gap-1.5 group"
                        >
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all", isFavorite ? "bg-red-500 shadow-lg shadow-red-500/20" : "bg-surface-800")}>
                                <Heart fill={isFavorite ? "white" : "none"} className={cn("w-5 h-5", isFavorite ? "text-white" : "text-gray-400")} />
                            </div>
                            <span className={cn("text-[9px] font-medium", isFavorite ? "text-red-400" : "text-gray-500")}>YÊU THÍCH</span>
                        </button>

                        <button 
                            onClick={() => setIsListOpen(true)}
                            className="flex flex-col items-center gap-1.5 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center group-active:scale-95 transition-all">
                                <ListPlus className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="text-[9px] font-medium text-gray-500 uppercase">DANH SÁCH</span>
                        </button>

                        <button 
                             onClick={() => setIsRateOpen(true)}
                             className="flex flex-col items-center gap-1.5 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center group-active:scale-95 transition-all">
                                <Star className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="text-[9px] font-medium text-gray-500 uppercase">ĐÁNH GIÁ</span>
                        </button>

                        <button 
                             onClick={() => setIsCommentOpen(true)}
                             className="flex flex-col items-center gap-1.5 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center group-active:scale-95 transition-all">
                                <MessageCircle className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="text-[9px] font-medium text-gray-500 uppercase">BÌNH LUẬN</span>
                        </button>

                        <button 
                            onClick={handleShare}
                            className="flex flex-col items-center gap-1.5 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center group-active:scale-95 transition-all">
                                <Share2 className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="text-[9px] font-medium text-gray-500 uppercase">CHIA SẺ</span>
                        </button>
                        {/* Yêu cầu Server VIP */}
                        <button 
                            onClick={handleRequest4k}
                            className="flex flex-col items-center gap-1.5 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center group-active:scale-95 transition-all relative overflow-hidden border border-yellow-500/20">
                                <div className="absolute inset-0 bg-gold-gradient opacity-10"></div>
                                <span className="text-[12px] font-black text-yellow-500 z-10">VIP</span>
                            </div>
                            <span className="text-[9px] font-medium text-yellow-500/80 uppercase">Server VIP</span>
                        </button>
                    </div>

                    {/* Reactions / Drama block Mobile */}
                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={() => handleReaction('fire')}
                            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all duration-300 active:scale-95 group relative overflow-hidden", userReaction === 'fire' ? "bg-gradient-to-r from-orange-500/20 to-red-500/10 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]" : "bg-gradient-to-br from-surface-800 to-surface-900 border-white/5")}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            <span className="text-xl drop-shadow-md group-hover:scale-110 transition-transform origin-bottom duration-300">🔥</span>
                            <div className="text-left leading-tight relative z-10">
                                <div className={cn("text-[11px] font-black tracking-wide", userReaction === 'fire' ? "text-orange-500" : "text-gray-300 group-hover:text-orange-400 transition-colors")}>Bánh cuốn!</div>
                                <div className="text-[10px] text-gray-500 font-medium">{fireCount} vote</div>
                            </div>
                        </button>

                        <button 
                            onClick={() => handleReaction('trash')}
                            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all duration-300 active:scale-95 group relative overflow-hidden", userReaction === 'trash' ? "bg-gradient-to-r from-red-500/20 to-rose-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-gradient-to-br from-surface-800 to-surface-900 border-white/5")}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            <span className="text-xl drop-shadow-md group-hover:scale-110 group-hover:-rotate-12 transition-transform origin-bottom duration-300">🍅</span>
                            <div className="text-left leading-tight relative z-10">
                                <div className={cn("text-[11px] font-black tracking-wide", userReaction === 'trash' ? "text-red-500" : "text-gray-300 group-hover:text-red-400 transition-colors")}>Rác phẩm!</div>
                                <div className="text-[10px] text-gray-500 font-medium">{trashCount} vote</div>
                            </div>
                        </button>
                    </div>

                    <Link href="/drama" className="flex items-center justify-center gap-2 py-2.5 mt-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-orange-500/20 hover:from-orange-500/20 hover:to-rose-500/20 transition-all duration-300 text-xs font-bold text-orange-400 active:scale-95 shadow-sm hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]">
                        <span className="text-sm drop-shadow-md">🔥</span> Vào Góc Drama
                    </Link>

                    {/* Removed EpisodeSelector from here since it's now in tabs */}

                    {/* 7. Tabs (Servers, Actors & Recommendations) */}
                    <div className="pt-4 space-y-6">
                        <div className="flex items-center gap-6 border-b border-white/5 px-2 overflow-x-auto hide-scrollbar">
                            <button 
                                onClick={() => setActiveTab('servers')}
                                className={cn("pb-3 text-sm font-bold tracking-tight transition-all relative whitespace-nowrap", activeTab === 'servers' ? "text-primary" : "text-gray-500")}
                            >
                                CHỌN TẬP
                                {activeTab === 'servers' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                            </button>
                            <button 
                                onClick={() => setActiveTab('actors')}
                                className={cn("pb-3 text-sm font-bold tracking-tight transition-all relative whitespace-nowrap", activeTab === 'actors' ? "text-primary" : "text-gray-500")}
                            >
                                DIỄN VIÊN
                                {activeTab === 'actors' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                            </button>
                            <button 
                                onClick={() => setActiveTab('recommendations')}
                                className={cn("pb-3 text-sm font-bold tracking-tight transition-all relative whitespace-nowrap", activeTab === 'recommendations' ? "text-primary" : "text-gray-500")}
                            >
                                ĐỀ XUẤT PHIM
                                {activeTab === 'recommendations' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="pb-20">
                            {activeTab === 'servers' ? (
                                <div className="px-2">
                                    <EpisodeSelector movie={movie} router={router} isMobile={true} />
                                </div>
                            ) : activeTab === 'actors' ? (
                                <div className="space-y-4 px-2">
                                    {movie.cast?.length ? (
                                        movie.cast.map((actor, idx) => (
                                            <Link 
                                                key={idx} 
                                                href={`/actor/${encodeURIComponent(actor.name)}`}
                                                className="flex items-center gap-4 bg-surface-900/40 p-3 rounded-2xl border border-white/5 active:bg-white/5 transition-colors"
                                            >
                                                <div className="w-14 h-14 rounded-full bg-gold-gradient p-[1px] shrink-0">
                                                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                                        {actor.profile_path ? (
                                                            <img src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-6 h-6 text-gray-500" />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-bold text-white">{actor.name}</h3>
                                                    <p className="text-[11px] text-gray-500 font-medium">{actor.character || 'Diễn viên'}</p>
                                                </div>
                                                <ChevronDown className="w-4 h-4 text-gray-600 -rotate-90" />
                                            </Link>
                                        ))
                                    ) : movie.actor?.length ? (
                                        movie.actor.map((actor, idx) => (
                                            <Link 
                                                key={idx} 
                                                href={`/actor/${encodeURIComponent(actor)}`}
                                                className="flex items-center gap-4 bg-surface-900/40 p-3 rounded-2xl border border-white/5 active:bg-white/5 transition-colors"
                                            >
                                                <div className="w-14 h-14 rounded-full bg-gold-gradient p-[1px] shrink-0">
                                                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                                        <User className="w-6 h-6 text-gray-500" />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-bold text-white">{actor}</h3>
                                                    <p className="text-[11px] text-gray-500 font-medium">Diễn viên chính</p>
                                                </div>
                                                <ChevronDown className="w-4 h-4 text-gray-600 -rotate-90" />
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm italic text-center py-10">Đang cập nhật danh sách diễn viên...</p>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {relatedMovies.length > 0 ? (
                                        relatedMovies.slice(0, 9).map((rel) => (
                                            <MovieCard key={rel._id} movie={rel} />
                                        ))
                                    ) : (
                                        <div className="col-span-3 py-10 text-center">
                                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Mobile Gallery & OST */}
                            <div className="px-2 pb-6 border-t border-white/10 mt-6 pt-6">
                                <MovieGallery images={Array.from(new Set([...(movie.tmdb_images || []), movie.thumb_url, movie.poster_url].filter(Boolean) as string[]))} />
                                <MovieOst ostId={movie.ost_id} source={movie.ost_source} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── DESKTOP VIEW ──────────────────────────────────────────────────────── */}
            <div className="hidden md:block md:-mt-16">
                {/* FULL SCREEN HERO SECTION */}
                <div className={`relative w-full h-[70vh] lg:h-[80vh] ${isPWA ? 'pt-[env(safe-area-inset-top)]' : ''}`}>

                    {/* Backdrop Image */}
                    <div className="absolute inset-0">
                        {/* Mobile: ảnh dọc (poster) - Note: redundant because of hidden md:block container but good for structure */}
                        <img
                            src={movie.poster_url || movie.thumb_url}
                            alt={movie.name}
                            className="w-full h-full object-cover object-top md:hidden"
                        />
                        {/* Desktop: ảnh ngang (thumb) để tránh zoom quá mức */}
                        <img
                            src={movie.thumb_url}
                            alt={movie.name}
                            className="w-full h-full object-cover object-center hidden md:block"
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
                                        <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/20 shadow-sm">
                                            <Star className="w-5 h-5 text-yellow-500 fill-current" />
                                            <span className="text-yellow-500 font-bold text-base">
                                                {movie.rating_average ? movie.rating_average.toFixed(1) : 'N/A'}
                                            </span>
                                            <span className="text-gray-400 text-xs font-normal">({movie.rating_count || 0})</span>
                                        </div>
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
                                            className="group relative h-11 md:h-13 px-8 bg-gold-gradient hover:brightness-110 text-black text-sm md:text-base font-extrabold rounded-xl shadow-glow hover:shadow-[0_0_30px_rgba(234,179,8,0.65)] transition-all duration-300 hover:scale-[1.04] active:scale-95 overflow-hidden border-none"
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
                                            className={`h-11 md:h-13 px-5 border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white text-sm md:text-base font-semibold rounded-xl backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] active:scale-95 ${isFavorite ? 'border-primary/60! text-primary! bg-primary/10' : ''}`}
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

                                        {/* Yêu cầu Server VIP */}
                                        <Button
                                            variant="outline"
                                            onClick={handleRequest4k}
                                            className="h-11 md:h-13 px-5 border border-yellow-500/30 hover:border-yellow-500/60 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-500 text-sm md:text-base font-bold rounded-xl backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] active:scale-95 group relative overflow-hidden"
                                            title="Yêu cầu Server VIP 1,2 (Chỉ dành cho Premium & VIP)"
                                        >
                                            <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                            <span className="mr-2 font-black text-lg leading-none shrink-0">VIP</span>
                                            Yêu cầu Server VIP 1,2
                                        </Button>
                                    </div>

                                    {/* Reactions / Drama block */}
                                    <div className="flex flex-wrap gap-4 pt-6 justify-center md:justify-start">
                                        <button 
                                            onClick={() => handleReaction('fire')}
                                            className={cn("flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300 hover:scale-[1.03] active:scale-95 group relative overflow-hidden", userReaction === 'fire' ? "bg-gradient-to-r from-orange-500/20 to-red-500/10 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]" : "bg-gradient-to-br from-surface-800 to-surface-900 border-white/5 hover:border-orange-500/30 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)]")}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                            <span className="text-2xl drop-shadow-lg group-hover:scale-110 transition-transform origin-bottom duration-300">🔥</span>
                                            <div className="text-left relative z-10">
                                                <div className={cn("text-sm font-black tracking-wide", userReaction === 'fire' ? "text-orange-500" : "text-gray-300 group-hover:text-orange-400 transition-colors")}>Bánh cuốn quá!</div>
                                                <div className="text-xs text-gray-500 font-medium">{fireCount} lượt vote</div>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => handleReaction('trash')}
                                            className={cn("flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300 hover:scale-[1.03] active:scale-95 group relative overflow-hidden", userReaction === 'trash' ? "bg-gradient-to-r from-red-500/20 to-rose-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "bg-gradient-to-br from-surface-800 to-surface-900 border-white/5 hover:border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]")}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                            <span className="text-2xl drop-shadow-lg group-hover:scale-110 group-hover:-rotate-12 transition-transform origin-bottom duration-300">🍅</span>
                                            <div className="text-left relative z-10">
                                                <div className={cn("text-sm font-black tracking-wide", userReaction === 'trash' ? "text-red-500" : "text-gray-300 group-hover:text-red-400 transition-colors")}>Rác phẩm!</div>
                                                <div className="text-xs text-gray-500 font-medium">{trashCount} lượt vote</div>
                                            </div>
                                        </button>
                                        
                                        <Link href="/drama" className="flex items-center gap-2 text-sm font-bold text-orange-500 hover:text-orange-400 mt-auto mb-3 transition-colors ml-2 drop-shadow-md">
                                            <span className="text-lg">🔥</span> Vào Góc Drama <ChevronDown className="w-4 h-4 -rotate-90" />
                                        </Link>
                                    </div>

                                    {/* Cast Preview (Mobile/Tablet only maybe? Keeping simple) */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ADDITIONAL DETAILS SECTION (Below Fold) */}
                <div className="bg-[#0a0a0a] pt-28 pb-16 lg:pt-40 lg:pb-24 border-t border-white/5">
                    <div className="container mx-auto px-4 md:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                            {/* Film Synopsis Full */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* Episodes Selector Desktop */}
                                <div className="hidden md:block">
                                    <EpisodeSelector movie={movie} router={router} />
                                </div>

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

                                {/* Desktop Gallery */}
                                <MovieGallery images={Array.from(new Set([...(movie.tmdb_images || []), movie.thumb_url, movie.poster_url].filter(Boolean) as string[]))} />

                                {/* Desktop OST */}
                                <MovieOst ostId={movie.ost_id} source={movie.ost_source} />

                                {/* ── DOWNLOAD SECTION ── */}
                                {movie.download_links && movie.download_links.length > 0 && (
                                    <div className="mt-8">
                                        <DownloadSection slug={movie.slug} links={movie.download_links} />
                                    </div>
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
                                <div className="mt-8 bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between bg-surface-900/80 p-1.5 border-b border-white/5 gap-2 md:gap-0">
                                        <div className="px-4 md:px-6 py-2">
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                <MessageCircle className="w-5 h-5 text-primary" />
                                                Cộng đồng
                                            </h3>
                                        </div>
                                        <div className="flex p-0.5 bg-black/20 rounded-2xl md:mr-2">
                                            <button
                                                onClick={() => setCommentSubTab('comment')}
                                                className={cn(
                                                    "flex-1 md:flex-none md:min-w-[140px] py-2 px-6 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2",
                                                    commentSubTab === 'comment' ? "bg-primary text-black shadow-lg" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                Bình luận
                                            </button>
                                            <button
                                                onClick={() => setCommentSubTab('rating')}
                                                className={cn(
                                                    "flex-1 md:flex-none md:min-w-[140px] py-2 px-6 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2",
                                                    commentSubTab === 'rating' ? "bg-primary text-black shadow-lg" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                Đánh giá
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        {commentSubTab === 'comment' ? (
                                            <CommentSection 
                                                movieSlug={slug as string} 
                                                hideRatingForm={true}
                                                formPosition="top"
                                                type="comment"
                                            />
                                        ) : (
                                            <CommentSection 
                                                movieSlug={slug as string} 
                                                onlyWithRating={false}
                                                hideRatingForm={false}
                                                type="rating"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Info */}
                            <div className="space-y-4">
                                {/* Desktop Trailer (Sidebar) */}
                                {movie.trailer_url && (
                                    <div className="hidden md:block mb-6">
                                        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                                            <Play className="w-4 h-4 text-primary fill-current" />
                                            Trailer
                                        </h3>
                                        <div className="w-full aspect-video rounded-xl overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 bg-black">
                                            <iframe 
                                                src={getEmbedUrl(movie.trailer_url)} 
                                                className="w-full h-full border-0" 
                                                allowFullScreen 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                loading="lazy"
                                            ></iframe>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                                    <h3 className="text-base font-bold text-white mb-3">Thông tin phim</h3>
                                    <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between border-b border-white/10 pb-1.5">
                                            <dt className="text-gray-400">Trạng thái</dt>
                                            <dd className="text-primary font-bold">{movie.status === 'completed' ? 'Hoàn tất' : 'Đang chiếu'}</dd>
                                        </div>
                                        <div className="flex justify-between border-b border-white/10 pb-1.5">
                                            <dt className="text-gray-400">Số tập</dt>
                                            <dd className="text-white">{movie.episodes?.find(e => !e.isHidden && !e.server_name.startsWith('NC -'))?.server_data?.length || '?'}</dd>
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

                                <div className="bg-surface-800/40 p-5 rounded-2xl border border-white/5 backdrop-blur-md">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-primary" />
                                        Diễn viên
                                    </h3>
                                    <div className="grid grid-cols-4 gap-3">
                                        {movie.cast?.length ? (
                                            movie.cast.slice(0, 12).map((actor, idx) => (
                                                <Link
                                                    key={idx}
                                                    href={`/actor/${encodeURIComponent(actor.name)}`}
                                                    className="group flex flex-col items-center p-1 rounded-xl hover:bg-white/5 transition-all duration-300"
                                                    title={actor.character ? `${actor.name} - Vai: ${actor.character}` : actor.name}
                                                >
                                                    <div className="relative w-11 h-11 mb-2 bg-gold-gradient rounded-full p-[1px] shadow-lg shadow-yellow-500/10 group-hover:shadow-primary/30 transition-all">
                                                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                                            {actor.profile_path ? (
                                                                <img src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-gray-400 text-center line-clamp-2 group-hover:text-primary transition-colors w-full px-0.5 min-h-[2.2em] flex items-center justify-center">
                                                        {actor.name}
                                                    </span>
                                                </Link>
                                            ))
                                        ) : movie.actor?.length ? (
                                            movie.actor.slice(0, 12).map((actor, idx) => (
                                                <Link
                                                    key={idx}
                                                    href={`/actor/${encodeURIComponent(actor)}`}
                                                    className="group flex flex-col items-center p-1 rounded-xl hover:bg-white/5 transition-all duration-300"
                                                >
                                                    <div className="relative w-11 h-11 mb-2 bg-gold-gradient rounded-full p-[1px] shadow-lg shadow-yellow-500/10 group-hover:shadow-primary/30 transition-all">
                                                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                                            <User className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-gray-400 text-center line-clamp-2 group-hover:text-primary transition-colors w-full px-0.5 min-h-[2.2em] flex items-center justify-center">
                                                        {actor}
                                                    </span>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="col-span-full text-gray-500 text-sm italic py-2">Đang cập nhật</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SHARED BOTTOM SHEETS (MOBILE ONLY) ────────────────────────────────── */}
            
            {/* 1. Full Movie Details Sheet */}
            <BottomSheet 
                isOpen={isDetailsOpen} 
                onClose={() => setIsDetailsOpen(false)}
                title="Chi tiết phim"
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                         <h3 className="text-lg font-bold">Nội dung</h3>
                         <div className="text-gray-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: movie?.content || '' }} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mb-1">
                                 <Calendar className="w-3 h-3" /> NĂM PHÁT HÀNH
                            </p>
                            <p className="text-sm font-bold">{movie?.year}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mb-1">
                                 <Clock className="w-3 h-3" /> THỜI LƯỢNG
                            </p>
                            <p className="text-sm font-bold">{movie?.time || 'N/A'}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mb-1">
                                <User className="w-3 h-3" /> ĐẠO DIỄN
                            </p>
                             <div className="text-sm font-bold truncate">
                                 {movie?.director?.join(', ') || 'N/A'}
                             </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mb-1">
                                <Star className="w-3 h-3" /> QUỐC GIA
                            </p>
                             <p className="text-sm font-bold truncate">{movie?.country?.map(c => c.name).join(', ') || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                         <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">QUY TRÌNH SẢN XUẤT</p>
                         <p className="text-sm font-medium text-gray-300 leading-relaxed">
                            Phim được sản xuất năm {movie?.year} với chất lượng {movie?.quality}. Hiện tại đang {movie?.status === 'completed' ? 'đã hoàn thiện và có đầy đủ tập' : 'trong quá trình cập nhật các tập mới'}.
                         </p>
                    </div>

                    <Button 
                        onClick={() => setIsDetailsOpen(false)}
                        className="w-full h-14 bg-surface-800 hover:bg-surface-700 text-white font-bold rounded-2xl"
                    >
                        ĐÓNG
                    </Button>
                </div>
            </BottomSheet>

            {/* 2. Add To List Sheet */}
            <BottomSheet 
                isOpen={isListOpen} 
                onClose={() => setIsListOpen(false)}
                title="Lưu vào danh sách"
            >
                {movie && (
                    <AddToListModal 
                        isOpen={isListOpen} 
                        onClose={() => setIsListOpen(false)} 
                        movieId={movie._id} 
                        standalone={true}
                    />
                )}
            </BottomSheet>

            {/* 3. Rating Sheet */}
            <BottomSheet 
                isOpen={isRateOpen} 
                onClose={() => setIsRateOpen(false)}
                title="Đánh giá phim"
            >
                <div className="space-y-8 text-center">
                    <div className="space-y-2">
                        <p className="text-gray-400 text-sm">Bạn cảm thấy phim này thế nào?</p>
                        <div className="flex items-center justify-center gap-2">
                             {[1, 2, 3, 4, 5].map((star) => (
                                <button 
                                    key={star}
                                    onMouseEnter={() => setRatingHover(star)}
                                    onMouseLeave={() => setRatingHover(0)}
                                    onClick={() => setUserRating(star)}
                                    className="p-1 transition-transform active:scale-90"
                                >
                                    <Star 
                                        className={cn(
                                            "w-10 h-10 transition-colors",
                                            (ratingHover || userRating) >= star ? "fill-yellow-500 text-yellow-500" : "text-gray-700"
                                        )}
                                    />
                                </button>
                             ))}
                        </div>
                        <div className="h-4">
                            {userRating > 0 && (
                                <p className="text-primary text-xs font-bold uppercase">
                                    {userRating === 1 ? 'Quá tệ' : userRating === 2 ? 'Kém' : userRating === 3 ? 'Bình thường' : userRating === 4 ? 'Hay' : 'Tuyệt vời!'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <textarea 
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            placeholder="Để lại nhận xét của bạn (tùy chọn)..."
                            className="w-full h-32 bg-surface-800 border-white/5 rounded-2xl p-4 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                onClick={() => setIsRateOpen(false)}
                                variant="outline"
                                className="h-12 border-white/10 rounded-xl font-bold"
                            >
                                Đóng
                            </Button>
                            <Button 
                                onClick={handleRateSubmit}
                                className="h-12 bg-primary text-black font-bold rounded-xl"
                            >
                                Gửi đánh giá
                            </Button>
                        </div>
                    </div>
                </div>
            </BottomSheet>

            {/* Comment Sheet */}
            <BottomSheet
                isOpen={isCommentOpen}
                onClose={() => setIsCommentOpen(false)}
                title="Cộng đồng"
                fullHeight={true}
                noPadding={true}
                closeOnOutsideClick={false}
            >
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="shrink-0 bg-surface-950/80 backdrop-blur-md px-4 py-2 border-b border-white/5">
                        <div className="flex bg-surface-800/50 p-1 rounded-2xl border border-white/5">
                            <button
                                onClick={() => setCommentSubTab('comment')}
                                className={cn(
                                    "flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                                    commentSubTab === 'comment' ? "bg-primary text-black shadow-lg" : "text-gray-400 hover:text-white"
                                )}
                            >
                                <MessageCircle className="w-4 h-4" />
                                Bình luận
                            </button>
                            <button
                                onClick={() => setCommentSubTab('rating')}
                                className={cn(
                                    "flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                                    commentSubTab === 'rating' ? "bg-primary text-black shadow-lg" : "text-gray-400 hover:text-white"
                                )}
                            >
                                <Star className="w-4 h-4" />
                                Đánh giá
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 pb-4">
                        {commentSubTab === 'comment' ? (
                            <CommentSection 
                                movieSlug={movie?.slug || ''} 
                                hideRatingForm={true}
                                formPosition="bottom"
                                compactInput={true}
                                type="comment"
                            />
                        ) : (
                            <CommentSection 
                                movieSlug={movie?.slug || ''} 
                                onlyWithRating={false}
                                hideForm={false}
                                compactInput={true}
                                type="rating"
                            />
                        )}
                    </div>
                </div>
            </BottomSheet>

            {/* Existing Desktop Modals (Shared) */}
            {movie && !isPWA && (
                <AddToListModal
                    isOpen={showListModal}
                    onClose={() => setShowListModal(false)}
                    movieId={movie._id}
                />
            )}
        </div>
    );
}
