'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { Play, ArrowLeft } from 'lucide-react';
import { ReportModal } from '@/components/ReportModal';
import { CommentSection } from '@/components/CommentSection';
import { DonateButton } from '@/components/DonateButton';
import Link from 'next/link';
import { API_URL } from '@/lib/config';

export const runtime = 'edge';
import { PWAAds } from '@/components/PWAAds';



// Types (Reuse same types)
interface Episode {
    server_name: string;
    server_data: {
        name: string;
        slug: string;
        link_m3u8: string;
        link_embed: string;
        time_intro?: number[];
        time_outro?: number[];
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
    const { slug } = useParams();
    const searchParams = useSearchParams();
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTabs, setShowTabs] = useState<'comment' | 'rating'>('comment');

    // Player State
    const [currentEpisode, setCurrentEpisode] = useState<{ name: string; slug: string; link_m3u8: string; link_embed: string; time_intro?: number[]; time_outro?: number[] } | null>(null);
    const [currentServerName, setCurrentServerName] = useState<string>('');
    const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);
    const [playerTime, setPlayerTime] = useState<number>(0);

    // Source State
    const [availableSources, setAvailableSources] = useState<string[]>([]);
    const [currentSource, setCurrentSource] = useState<string>('');
    const [filteredServers, setFilteredServers] = useState<Episode[]>([]);
    const [viewingServerName, setViewingServerName] = useState<string>('');

    // Next/Prev Episode State
    const [prevEpisode, setPrevEpisode] = useState<{ server: string; episode: { name: string; slug: string; link_m3u8: string; link_embed: string; time_intro?: number[]; time_outro?: number[] } } | null>(null);
    const [nextEpisode, setNextEpisode] = useState<{ server: string; episode: { name: string; slug: string; link_m3u8: string; link_embed: string; time_intro?: number[]; time_outro?: number[] } } | null>(null);

    // Get query params
    const episodeParam = searchParams.get('episode');
    const timestampParam = searchParams.get('t');
    const serverParam = searchParams.get('server');

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
        movie.episodes.forEach((ep: Episode) => {
            const name = ep.server_name;
            if (name.startsWith('NC -')) sources.add('NguonC');
            else if (name.startsWith('KK -')) sources.add('KKPhim');
            else if (name.startsWith('OP -')) sources.add('Ophim');
            else sources.add('Khác');
        });

        // Priority Order
        const sourceOrder = ['KKPhim', 'NguonC', 'Ophim', 'Khác'];
        const sortedSources = Array.from(sources).sort((a, b) => {
            return sourceOrder.indexOf(a) - sourceOrder.indexOf(b);
        });

        setAvailableSources(sortedSources);

        // 2. Set Default Source
        let activeSource = currentSource;
        if ((!activeSource || !sources.has(activeSource)) && sortedSources.length > 0) {
            if (serverParam && movie?.episodes) {
                // Find which prefix this exact serverParam belongs to
                const matchedServer = movie.episodes.find(ep => ep.server_name === serverParam);
                if (matchedServer) {
                    const name = matchedServer.server_name;
                    if (name.startsWith('NC -')) activeSource = 'NguonC';
                    else if (name.startsWith('KK -')) activeSource = 'KKPhim';
                    else if (name.startsWith('OP -')) activeSource = 'Ophim';
                    else activeSource = 'Khác';
                }
            }
            if (!activeSource || !sources.has(activeSource)) {
                activeSource = sortedSources[0];
            }
            setCurrentSource(activeSource);
        }

        // 3. Filter Servers
        if (activeSource) {
            const prefixMap: Record<string, string> = {
                'NguonC': 'NC -',
                'KKPhim': 'KK -',
                'Ophim': 'OP -',
                'Khác': ''
            };
            const prefix = prefixMap[activeSource];

            const filtered = movie.episodes.filter((ep: Episode) => {
                if (activeSource === 'Khác') {
                    return !ep.server_name.startsWith('NC -') &&
                        !ep.server_name.startsWith('KK -') &&
                        !ep.server_name.startsWith('OP -');
                }
                return ep.server_name.startsWith(prefix);
            });

            // Deduplicate servers by clean name
            const uniqueServersMap = new Map<string, Episode>();
            filtered.forEach(ep => {
                const cleanName = getCleanServerName(ep.server_name);
                if (!uniqueServersMap.has(cleanName)) {
                    uniqueServersMap.set(cleanName, ep);
                }
            });
            const deduplicatedFiltered = Array.from(uniqueServersMap.values());

            setFilteredServers(deduplicatedFiltered);

            // 4. Auto-select episode from URL or first episode
            if (!currentEpisode && deduplicatedFiltered.length > 0) {
                let selectedEpisode = null;
                let selectedServer = null;

                // Try to find episode from URL param
                if (episodeParam) {
                    // Try to match serverParam first if provided (check full movie episodes list too)
                    if (serverParam && movie?.episodes) {
                        const targetServer = movie.episodes.find(s => s.server_name === serverParam);
                        if (targetServer) {
                            const found = targetServer.server_data.find((ep: { slug: string }) => ep.slug === episodeParam);
                            if (found) {
                                selectedEpisode = found;
                                selectedServer = targetServer.server_name;
                            }
                        }
                    }

                    // Fallback to searching all filtered servers if no exact serverParam match
                    if (!selectedEpisode) {
                        for (const server of deduplicatedFiltered) {
                            const found = server.server_data.find((ep: { slug: string }) => ep.slug === episodeParam);
                            if (found) {
                                selectedEpisode = found;
                                selectedServer = server.server_name;
                                break;
                            }
                        }
                    }
                }

                // If not found or no param, but we have serverParam, try to pick first ep of that exact server
                // We check against all movie episodes because `filtered` might just be a broad category prefix
                if (!selectedEpisode && serverParam && movie?.episodes) {
                    const targetServer = movie.episodes.find(s => s.server_name === serverParam);
                    if (targetServer && targetServer.server_data.length > 0) {
                        selectedEpisode = targetServer.server_data[0];
                        selectedServer = targetServer.server_name;
                    }
                }

                // If not found or no param, use first episode
                if (!selectedEpisode && deduplicatedFiltered[0].server_data.length > 0) {
                    selectedEpisode = deduplicatedFiltered[0].server_data[0];
                    selectedServer = deduplicatedFiltered[0].server_name;
                }

                if (selectedEpisode && selectedServer) {
                    setCurrentEpisode(selectedEpisode);
                    setCurrentServerName(selectedServer);
                    setViewingServerName(selectedServer);
                    setShouldAutoPlay(true);

                    // Set start time from URL param
                    if (timestampParam) {
                        const time = parseInt(timestampParam);
                        if (!isNaN(time)) {
                            setStartTime(time);
                        }
                    }
                }
            }
        }

    }, [movie, currentSource, episodeParam, timestampParam, serverParam]);

    // Find prev/next episode
    useEffect(() => {
        if (!currentEpisode || !currentServerName || filteredServers.length === 0) {
            setPrevEpisode(null);
            setNextEpisode(null);
            return;
        }

        // Find current server and episode index
        for (const server of filteredServers) {
            if (server.server_name === currentServerName) {
                const currentIndex = server.server_data.findIndex(ep => ep.slug === currentEpisode.slug);

                if (currentIndex !== -1) {
                    // 1. Next episode in same server
                    if (currentIndex < server.server_data.length - 1) {
                        setNextEpisode({
                            server: server.server_name,
                            episode: server.server_data[currentIndex + 1]
                        });
                    } else {
                        // Try next server for next episode
                        const serverIndex = filteredServers.findIndex(s => s.server_name === currentServerName);
                        if (serverIndex !== -1 && serverIndex < filteredServers.length - 1) {
                            const nextServer = filteredServers[serverIndex + 1];
                            if (nextServer.server_data.length > 0) {
                                setNextEpisode({
                                    server: nextServer.server_name,
                                    episode: nextServer.server_data[0]
                                });
                            } else {
                                setNextEpisode(null);
                            }
                        } else {
                            setNextEpisode(null);
                        }
                    }

                    // 2. Prev episode in same server
                    if (currentIndex > 0) {
                        setPrevEpisode({
                            server: server.server_name,
                            episode: server.server_data[currentIndex - 1]
                        });
                    } else {
                        // Try prev server for prev episode
                        const serverIndex = filteredServers.findIndex(s => s.server_name === currentServerName);
                        if (serverIndex > 0) {
                            const prevServer = filteredServers[serverIndex - 1];
                            if (prevServer.server_data.length > 0) {
                                setPrevEpisode({
                                    server: prevServer.server_name,
                                    episode: prevServer.server_data[prevServer.server_data.length - 1]
                                });
                            } else {
                                setPrevEpisode(null);
                            }
                        } else {
                            setPrevEpisode(null);
                        }
                    }
                }
                break;
            }
        }
    }, [currentEpisode, currentServerName, filteredServers]);

    const handleEpisodeClick = (serverName: string, episode: { name: string; slug: string; link_m3u8: string; link_embed: string; time_intro?: number[]; time_outro?: number[] }) => {
        const isSameEpisode = currentEpisode?.slug === episode.slug;

        setCurrentServerName(serverName);
        setViewingServerName(serverName);
        setCurrentEpisode(episode);
        setShouldAutoPlay(true);

        // Restore time if switching versions of the same episode
        if (isSameEpisode) {
            setStartTime(playerTime);
        } else {
            setStartTime(0);
        }

        // Update URL
        const newUrl = `/movie/${slug}/watch?episode=${episode.slug}&server=${encodeURIComponent(serverName)}`;
        window.history.replaceState({}, '', newUrl);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSourceChange = (newSource: string) => {
        if (newSource === currentSource) return;

        setCurrentSource(newSource);

        // Auto-switch to same episode on new source if we have a currentEpisode
        if (movie?.episodes) {
            const prefixMap: Record<string, string> = {
                'NguonC': 'NC -',
                'KKPhim': 'KK -',
                'Ophim': 'OP -',
                'Khác': ''
            };
            const prefix = prefixMap[newSource];

            const targetServers = movie.episodes.filter((ep: Episode) => {
                if (newSource === 'Khác') {
                    return !ep.server_name.startsWith('NC -') &&
                        !ep.server_name.startsWith('KK -') &&
                        !ep.server_name.startsWith('OP -');
                }
                return ep.server_name.startsWith(prefix);
            });

            if (targetServers.length > 0) {
                // Try to match exact server type (e.g. Vietsub -> Vietsub)
                const currentType = getCleanServerName(currentServerName || '');

                let bestServer = targetServers.find(s => getCleanServerName(s.server_name) === currentType);
                if (!bestServer) bestServer = targetServers[0];

                let epInNewServer = null;
                if (currentEpisode) {
                    epInNewServer = bestServer.server_data.find(ep => ep.slug === currentEpisode.slug);
                }
                if (!epInNewServer && bestServer.server_data.length > 0) {
                    epInNewServer = bestServer.server_data[0];
                }

                if (epInNewServer) {
                    handleEpisodeClick(bestServer.server_name, epInNewServer);
                }
            }
        }
    };

    const handleNextEpisode = () => {
        if (nextEpisode) {
            handleEpisodeClick(nextEpisode.server, nextEpisode.episode);
        }
    };

    const handlePrevEpisode = () => {
        if (prevEpisode) {
            handleEpisodeClick(prevEpisode.server, prevEpisode.episode);
        }
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
        <div className={`min-h-screen bg-black text-white font-sans mt-0`}>

            {/* Header / Nav Back */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 py-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
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
                    <div className="hidden md:flex items-center gap-4">
                        <DonateButton />
                        <div className="hidden md:flex items-center gap-2">
                            {movie && (
                                <ReportModal
                                    movieSlug={movie.slug}
                                    movieName={movie.name}
                                    episodeSlug={currentEpisode?.slug}
                                    episodeName={currentEpisode?.name}
                                    serverName={currentServerName}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-0 md:px-4 py-4 md:py-6 flex flex-col lg:flex-row gap-6">

                {/* 1. MAIN PLAYER (Left/Top) */}
                <div className="flex-1 w-full min-w-0">

                    {/* AD BANNER (Non-Premium) */}
                    <div className="mb-4">
                        <PWAAds variant="watch" />
                    </div>

                    <div className="aspect-video bg-black md:rounded-xl overflow-visible shadow-2xl border-t border-b md:border border-white/10 relative">
                        {currentEpisode ? (
                            <VideoPlayer
                                key={`${currentEpisode.slug}-${currentServerName}`}
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
                                intro={currentEpisode.time_intro}
                                outro={currentEpisode.time_outro}
                                startTime={startTime}
                                onTimeUpdate={(time) => setPlayerTime(time)}
                                onEnded={handleNextEpisode}
                                nextEpisodeInfo={nextEpisode ? {
                                    name: nextEpisode.episode.name,
                                    serverName: getCleanServerName(nextEpisode.server)
                                } : undefined}
                                prevEpisodeInfo={prevEpisode ? {
                                    name: prevEpisode.episode.name,
                                    serverName: getCleanServerName(prevEpisode.server)
                                } : undefined}
                                onNextEpisode={handleNextEpisode}
                                onPrevEpisode={handlePrevEpisode}
                                episodeServers={filteredServers.map(s => ({
                                    server_name: s.server_name,
                                    cleanName: getCleanServerName(s.server_name),
                                    episodes: s.server_data.map((ep: { slug: string; name: string }) => ({
                                        slug: ep.slug,
                                        name: ep.name
                                    }))
                                }))}
                                onEpisodeSelect={(serverName, episodeSlug) => {
                                    const server = filteredServers.find(s => s.server_name === serverName);
                                    const ep = server?.server_data.find((e: { slug: string }) => e.slug === episodeSlug);
                                    if (ep) handleEpisodeClick(serverName, ep);
                                }}
                                onError={currentSource === 'NguonC' ? () => {
                                    // Auto-switch to next available source when NC fails
                                    const fallback = availableSources.find(s => s !== 'NguonC');
                                    if (fallback) handleSourceChange(fallback);
                                } : undefined}
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

                            {/* Report & Donate Buttons - Mobile and Tablet */}
                            <div className="flex md:hidden items-center gap-2 shrink-0 mt-3 sm:mt-0">
                                <DonateButton />
                                {movie && (
                                    <ReportModal
                                        movieSlug={movie.slug}
                                        movieName={movie.name}
                                        episodeSlug={currentEpisode?.slug}
                                        episodeName={currentEpisode?.name}
                                        serverName={currentServerName}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Source Tabs - Hidden on desktop (moved to sidebar) */}
                        {availableSources.length > 1 && (
                            <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto">
                                <span className="text-xs font-bold text-gray-500 uppercase shrink-0">Nguồn:</span>
                                {availableSources.map((source, index) => (
                                    <button
                                        key={source}
                                        onClick={() => handleSourceChange(source)}
                                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap ${currentSource === source
                                            ? 'bg-primary text-black shadow-md shadow-primary/20'
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
                <div className="w-full lg:w-96 px-4 md:px-0 space-y-4 shrink-0">
                    <div className="bg-surface-900/30 rounded-xl border border-white/5 overflow-hidden flex flex-col h-full lg:sticky lg:top-24">
                        <div className="p-4 border-b border-white/5 bg-surface-900/80 backdrop-blur-sm space-y-3">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Play className="w-4 h-4 text-primary fill-current" />
                                Danh Sách Tập
                            </h3>
                            {/* Source Tabs - Desktop only (inside sidebar) */}
                            {availableSources.length > 1 && (
                                <div className="hidden lg:flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-gray-500 uppercase shrink-0">Nguồn:</span>
                                    {availableSources.map((source, index) => (
                                        <button
                                            key={source}
                                            onClick={() => handleSourceChange(source)}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap ${currentSource === source
                                                ? 'bg-primary text-black shadow-md shadow-primary/20'
                                                : 'bg-surface-700 text-gray-400 hover:bg-surface-600 hover:text-white border border-white/5'
                                                }`}
                                        >
                                            Server {index + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 flex-1 space-y-4 flex flex-col">
                            {/* Server/Category Horizontal Tabs */}
                            {filteredServers.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar border-b border-white/10 shrink-0">
                                    {filteredServers.map((server) => {
                                        const cleanName = getCleanServerName(server.server_name);
                                        const isActiveTab = viewingServerName === server.server_name;
                                        return (
                                            <button
                                                key={`tab-${server.server_name}`}
                                                onClick={() => setViewingServerName(server.server_name)}
                                                className={`px-4 py-2 text-sm font-bold whitespace-nowrap rounded-t-lg transition-all border-b-2 ${isActiveTab
                                                    ? 'text-primary border-primary bg-primary/10'
                                                    : 'text-gray-400 hover:text-white border-transparent hover:bg-white/5'
                                                    }`}
                                            >
                                                {cleanName}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Episodes Grid for the active tab */}
                            {filteredServers.map((server) => {
                                if (server.server_name !== viewingServerName) return null;
                                return (
                                    <div key={server.server_name} className="flex-1">
                                        <div className="grid grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                            {server.server_data.map((ep: { slug: string; name: string; link_m3u8: string; link_embed: string; time_intro?: number[]; time_outro?: number[] }) => {
                                                const isPlaying = currentEpisode?.slug === ep.slug && currentServerName === server.server_name;
                                                return (
                                                    <button
                                                        key={ep.slug}
                                                        onClick={() => handleEpisodeClick(server.server_name, ep)}
                                                        className={`px-2 py-3 text-xs font-medium rounded-lg transition-all border relative flex items-center justify-center ${isPlaying
                                                            ? 'bg-primary text-black border-primary font-bold shadow-md'
                                                            : 'bg-surface-800 text-gray-300 border-transparent hover:bg-surface-700 hover:text-white hover:border-white/10'
                                                            }`}
                                                    >
                                                        {ep.name}
                                                        {isPlaying && (
                                                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-black/20 rounded-full animate-pulse"></span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>

            {/* Comments Section */}
            {movie && (
                <div className="max-w-7xl mx-auto w-full px-4 md:px-6 pb-12">
                    <div className="mt-8 bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between bg-surface-900/80 p-1.5 border-b border-white/5 gap-2 md:gap-0">
                            <div className="px-4 md:px-6 py-2">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    Mọi người đang nói gì?
                                </h3>
                            </div>
                            <div className="flex p-0.5 bg-black/20 rounded-2xl md:mr-2">
                                <button
                                    onClick={() => setShowTabs('comment')}
                                    className={`flex-1 md:flex-none md:min-w-[140px] py-2 px-6 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${showTabs === 'comment' ? "bg-primary text-black shadow-lg" : "text-gray-500 hover:text-white"}`}
                                >
                                    Bình luận
                                </button>
                                <button
                                    onClick={() => setShowTabs('rating')}
                                    className={`flex-1 md:flex-none md:min-w-[140px] py-2 px-6 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${showTabs === 'rating' ? "bg-primary text-black shadow-lg" : "text-gray-500 hover:text-white"}`}
                                >
                                    Đánh giá
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            {showTabs === 'comment' ? (
                                <CommentSection
                                    movieSlug={movie.slug}
                                    episodeName={currentEpisode?.name}
                                    type="comment"
                                    hideRatingForm={true}
                                />
                            ) : (
                                <CommentSection
                                    movieSlug={movie.slug}
                                    episodeName={currentEpisode?.name}
                                    type="rating"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
