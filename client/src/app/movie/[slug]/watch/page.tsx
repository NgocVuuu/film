'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { Play, ArrowLeft, Star, Clock, AlertTriangle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { API_URL } from '@/lib/config';
import { useAuth } from '@/contexts/auth-context';

export const runtime = 'edge';

// Types (Reuse same types)
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
}

export default function WatchPage() {
    const { user } = useAuth();
    const { slug } = useParams();
    const router = useRouter();
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Player State
    const [currentEpisode, setCurrentEpisode] = useState<any>(null);
    const [currentServerName, setCurrentServerName] = useState<string>('');
    const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

    // Source State
    const [availableSources, setAvailableSources] = useState<string[]>([]);
    const [currentSource, setCurrentSource] = useState<string>('');
    const [filteredServers, setFilteredServers] = useState<any[]>([]);

    useEffect(() => {
        if (!slug) return;
        fetch(`${API_URL}/api/movie/${slug}`, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setMovie(data.data);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, [slug]);

    // Initialize Sources and Default Episode
    useEffect(() => {
        if (!movie || !movie.episodes) return;

        // 1. Identify Sources
        const sources = new Set<string>();
        movie.episodes.forEach((ep: any) => {
            const name = ep.server_name;
            if (name.startsWith('NC -')) sources.add('NguonC');
            else if (name.startsWith('KK -')) sources.add('KKPhim');
            else if (name.startsWith('OP -')) sources.add('Ophim');
            else sources.add('Khác');
        });

        // Priority Order
        const sourceOrder = ['NguonC', 'KKPhim', 'Ophim', 'Khác'];
        const sortedSources = Array.from(sources).sort((a, b) => {
            return sourceOrder.indexOf(a) - sourceOrder.indexOf(b);
        });

        setAvailableSources(sortedSources);

        // 2. Set Default Source
        let activeSource = currentSource;
        if ((!activeSource || !sources.has(activeSource)) && sortedSources.length > 0) {
            activeSource = sortedSources[0];
            setCurrentSource(activeSource);
        }

        // 3. Filter Servers and Auto-Select First Episode
        if (activeSource) {
            const prefixMap: Record<string, string> = {
                'NguonC': 'NC -',
                'KKPhim': 'KK -',
                'Ophim': 'OP -',
                'Khác': ''
            };
            const prefix = prefixMap[activeSource];

            const filtered = movie.episodes.filter((ep: any) => {
                if (activeSource === 'Khác') {
                    return !ep.server_name.startsWith('NC -') &&
                        !ep.server_name.startsWith('KK -') &&
                        !ep.server_name.startsWith('OP -');
                }
                return ep.server_name.startsWith(prefix);
            });
            setFilteredServers(filtered);

            // Auto-select first episode if not yet selected
            if (!currentEpisode && filtered.length > 0 && filtered[0].server_data.length > 0) {
                setCurrentEpisode(filtered[0].server_data[0]);
                setCurrentServerName(filtered[0].server_name);
                setShouldAutoPlay(true); // Auto play when entering watch page
            }
        }

    }, [movie, currentSource]);

    const handleEpisodeClick = (serverName: string, episode: any) => {
        setCurrentServerName(serverName);
        setCurrentEpisode(episode);
        setShouldAutoPlay(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getCleanServerName = (rawName: string) => {
        const lowerName = rawName.toLowerCase();

        // 1. Detect Type (Priority)
        if (lowerName.includes('vietsub')) return 'Vietsub';
        if (lowerName.includes('thuyết minh') || lowerName.includes('thuyet minh')) return 'Thuyết Minh';
        if (lowerName.includes('lồng tiếng') || lowerName.includes('long tieng')) return 'Lồng Tiếng';
        if (lowerName.includes('engsub')) return 'Engsub';

        // 2. Clean up if no type detected (Fallback)
        return rawName
            .replace(/^(NC|KK|OP|SERVER)[\s-]*#?/i, '')
            .replace(/#[\w\s\.]+/, '') // Remove #Location
            .replace(/\(.*\)/, '')      // Remove (...)
            .trim() || 'Server Dự Phòng';
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-primary animate-pulse">Đang tải phim...</div>;
    if (!movie) return <div className="min-h-screen flex items-center justify-center bg-black text-red-500">Phim không tồn tại.</div>;

    return (
        <div className="min-h-screen bg-black text-white font-sans -mt-16">

            {/* Header / Nav Back */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 py-3 px-4">
                <div className="container mx-auto flex items-center gap-4">
                    <Link href={`/movie/${movie.slug}`} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold truncate text-white">{movie.name}</h1>
                        <p className="text-xs text-gray-400 truncate">
                            {currentEpisode ? `Đang xem: ${currentEpisode.name}` : movie.origin_name}
                        </p>
                    </div>
                    {/* Optional: Add minimal controls or report button here */}
                    <div className="hidden sm:flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-red-400">
                            <AlertTriangle className="w-4 h-4 mr-1" /> Báo lỗi
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-0 md:px-4 py-4 md:py-6 flex flex-col lg:flex-row gap-6">

                {/* 1. MAIN PLAYER (Left/Top) */}
                <div className="flex-1 w-full min-w-0">

                    {/* AD BANNER (Non-Premium) */}
                    {user?.subscription?.tier !== 'premium' && (
                        <div className="w-full bg-surface-900/50 border border-white/10 rounded-xl p-4 mb-4 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/20 p-2 rounded-lg">
                                    <Crown className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Nâng cấp Premium</p>
                                    <p className="text-xs text-gray-400">Xem phim không quảng cáo & chất lượng cao</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className="bg-primary text-black hover:bg-primary/90"
                                onClick={() => router.push('/pricing')}
                            >
                                Nâng cấp ngay
                            </Button>
                        </div>
                    )}

                    <div className="aspect-video bg-black md:rounded-xl overflow-hidden shadow-2xl border-t border-b md:border border-white/10 relative">
                        {currentEpisode ? (
                            <VideoPlayer
                                key={currentEpisode.link_m3u8}
                                src={currentEpisode.link_m3u8}
                                poster={movie.poster_url}
                                embedUrl={currentEpisode.link_embed}
                                autoPlay={shouldAutoPlay}
                                movieSlug={movie.slug}
                                movieName={movie.name}
                                movieThumb={movie.thumb_url}
                                episodeSlug={currentEpisode.slug}
                                episodeName={currentEpisode.name}
                                serverName={currentServerName}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface-900">
                                <p className="text-gray-500">Đang tải player...</p>
                            </div>
                        )}
                    </div>

                    {/* Source Selector & Meta below player */}
                    <div className="mt-4 px-4 md:px-0 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-900/50 p-4 rounded-xl border border-white/5">
                            <div>
                                <h1 className="text-xl font-bold text-primary mb-1">{movie.name}</h1>
                                <p className="text-sm text-gray-400">
                                    {movie.origin_name} • {movie.year}
                                    {currentEpisode && (
                                        <>
                                            {' • '}
                                            <span className="text-white font-medium">{currentEpisode.name}</span>
                                            {currentServerName && (
                                                <>
                                                    {' • '}
                                                    <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold">
                                                        {getCleanServerName(currentServerName)}
                                                    </span>
                                                </>
                                            )}
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Source Tabs */}
                        {availableSources.length > 1 && (
                            <div className="flex items-center gap-3 overflow-x-auto pb-2">
                                <span className="text-sm font-bold text-gray-500 uppercase">Đổi nguồn:</span>
                                {availableSources.map((source, index) => (
                                    <button
                                        key={source}
                                        onClick={() => setCurrentSource(source)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${currentSource === source
                                            ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                            : 'bg-surface-800 text-gray-400 hover:bg-surface-700 hover:text-white border border-white/5'
                                            }`}
                                    >
                                        Server {index + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. EPISODE SIDEBAR (Right/Bottom) */}
                <div className="w-full lg:w-96 px-4 md:px-0 space-y-4 flex-shrink-0">
                    <div className="bg-surface-900/30 rounded-xl border border-white/5 overflow-hidden flex flex-col h-full max-h-[calc(100vh-100px)] lg:sticky lg:top-24">
                        <div className="p-4 border-b border-white/5 bg-surface-900/80 backdrop-blur-sm">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Play className="w-4 h-4 text-primary fill-current" />
                                Danh Sách Tập
                            </h3>
                        </div>

                        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            {filteredServers.map((server: any) => (
                                <div key={server.server_name}>
                                    <h4 className="inline-block px-3 py-1 rounded bg-primary/20 text-primary text-xs font-bold mb-3 uppercase tracking-wider border border-primary/20">
                                        {getCleanServerName(server.server_name)}
                                    </h4>
                                    <div className="grid grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                        {server.server_data.map((ep: any) => {
                                            const isActive = currentEpisode === ep;
                                            return (
                                                <button
                                                    key={ep.slug}
                                                    onClick={() => handleEpisodeClick(server.server_name, ep)}
                                                    className={`px-2 py-3 text-xs font-medium rounded-lg transition-all border relative ${isActive
                                                        ? 'bg-primary text-black border-primary font-bold shadow-md'
                                                        : 'bg-surface-800 text-gray-300 border-transparent hover:bg-surface-700 hover:text-white hover:border-white/10'
                                                        }`}
                                                >
                                                    {ep.name}
                                                    {isActive && (
                                                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-black/20 rounded-full animate-pulse"></span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
