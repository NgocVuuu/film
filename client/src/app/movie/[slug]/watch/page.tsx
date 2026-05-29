'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { Play, ArrowLeft, Crown, Lock, Share2 } from 'lucide-react';
import { ReportModal } from '@/components/ReportModal';
import { CommentSection } from '@/components/CommentSection';
import { ShareMomentModal } from '@/components/ShareMomentModal';
import { DonateButton } from '@/components/DonateButton';
import Link from 'next/link';
import { API_URL } from '@/lib/config';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/auth-context';
import { PWAAds } from '@/components/PWAAds';
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { encodeServerForUrl, decodeServerFromUrl } from '@/lib/serverUrl';



// Types (Reuse same types)
interface Episode {
    server_name: string;
    isHidden?: boolean;
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
    const router = useRouter();
    const { user } = useAuth();
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTabs, setShowTabs] = useState<'comment' | 'rating'>('comment');

    // Watch Party State
    const [socket, setSocket] = useState<Socket | null>(null);

    // Player State
    const [currentEpisode, setCurrentEpisode] = useState<{ name: string; slug: string; link_m3u8: string; link_embed: string; time_intro?: number[]; time_outro?: number[] } | null>(null);
    const [currentServerName, setCurrentServerName] = useState<string>('');
    const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);
    const [playerTime, setPlayerTime] = useState<number>(0);
    const [momentTime, setMomentTime] = useState<number | null>(null);
    const [refreshComments, setRefreshComments] = useState(0);

    // Track if we've already done initial URL-based server selection
    const hasInitialized = useRef(false);

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
    const serverParamRaw = searchParams.get('server');
    const roomParam = searchParams.get('room');

    // Decode server param from URL (may be short ID or legacy raw name)
    const serverParam = serverParamRaw ? decodeServerFromUrl(serverParamRaw) : null;

    useEffect(() => {
        // Lấy JWT token từ cookie để xác thực socket
        const getCookie = (name: string) =>
            document.cookie.match(`(^|;)\\s*${name}=([^;]+)`)?.pop() || '';
        const token = getCookie('token');

        const newSocket = io(API_URL, {
            path: '/socket.io',
            auth: { token },
            transports: ['websocket', 'polling']
        });
        setSocket(newSocket);
        
        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Realtime Sync: Listen for new episodes uploaded by the pipeline
    useEffect(() => {
        if (!socket || !slug) return;
        
        const handleEpisodeAdded = (data: any) => {
            if (data.movieSlug === slug) {
                setMovie((prevMovie: any) => {
                    if (!prevMovie) return prevMovie;
                    const nextMovie = JSON.parse(JSON.stringify(prevMovie));
                    let serverObj = nextMovie.episodes.find((e: any) => e.server_name === data.serverName);
                    if (!serverObj) {
                        serverObj = { server_name: data.serverName, server_data: [] };
                        nextMovie.episodes.push(serverObj);
                    }
                    const exists = serverObj.server_data.find((ep: any) => ep.slug === data.episode.slug);
                    if (!exists) {
                        serverObj.server_data.push(data.episode);
                    } else {
                        Object.assign(exists, data.episode);
                    }
                    // Sort episodes numerically (1, 2, ..., 10, 11)
                    serverObj.server_data.sort((a: any, b: any) => {
                        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                        return numA - numB;
                    });
                    return nextMovie;
                });
                toast.success(`Tập "${data.episode.name}" vừa có thêm server mới, hãy tải lại trang nếu bạn đang gặp lỗi!`, {
                    duration: 5000,
                    icon: '🚀'
                });
            }
        };

        socket.on('episode_added', handleEpisodeAdded);
        
        return () => {
            socket.off('episode_added', handleEpisodeAdded);
        };
    }, [socket, slug]);

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

        // Filter out NguonC, old PChill Server, and hidden servers entirely
        const validEpisodes = movie.episodes.filter(ep => 
            !ep.isHidden &&
            !ep.server_name.startsWith('NC -') && 
            ep.server_name !== 'PChill Server'
        );

        // 1. Identify Sources
        const sources = new Set<string>();
        validEpisodes.forEach((ep: Episode) => {
            const name = ep.server_name;
            if (name.startsWith('KK -')) sources.add('Server 1');
            else if (name.startsWith('OP -')) sources.add('Server 2');
            else if (name.includes('PChill - Play4Me')) sources.add('PChill VIP 2');
            else if (name.includes('PChill - Seekstreaming')) sources.add('PChill VIP 1');
            else sources.add('Khác');
        });

        // Priority Order: Free first (default for non-VIP), then VIP
        const sourceOrder = ['Server 1', 'Server 2', 'PChill VIP 1', 'PChill VIP 2', 'Khác'];
        const sortedSources = Array.from(sources).sort((a, b) => {
            return sourceOrder.indexOf(a) - sourceOrder.indexOf(b);
        });

        setAvailableSources(sortedSources);

        // 2. Set Default Source (only use serverParam on first load)
        let activeSource = currentSource;
        if ((!activeSource || !sources.has(activeSource)) && sortedSources.length > 0) {
            if (!hasInitialized.current && serverParam && validEpisodes.length > 0) {
                // Find which prefix this exact serverParam belongs to (first load only)
                const matchedServer = validEpisodes.find(ep => ep.server_name === serverParam);
                if (matchedServer) {
                    const name = matchedServer.server_name;
                    if (name.startsWith('KK -')) activeSource = 'Server 1';
                    else if (name.startsWith('OP -')) activeSource = 'Server 2';
                    else if (name.includes('PChill - Play4Me')) activeSource = 'PChill VIP 2';
                    else if (name.includes('PChill - Seekstreaming')) activeSource = 'PChill VIP 1';
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
                'Server 1': 'KK -',
                'Server 2': 'OP -'
            };
            const prefix = prefixMap[activeSource] || '';

            const filtered = validEpisodes.filter((ep: Episode) => {
                if (activeSource === 'PChill VIP 1') {
                    return ep.server_name.includes('PChill - Seekstreaming');
                }
                if (activeSource === 'PChill VIP 2') {
                    return ep.server_name.includes('PChill - Play4Me');
                }
                if (activeSource === 'Khác') {
                    return !ep.server_name.startsWith('KK -') &&
                        !ep.server_name.startsWith('OP -') &&
                        !ep.server_name.startsWith('PChill');
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
                    if (serverParam && validEpisodes.length > 0) {
                        const targetServer = validEpisodes.find(s => s.server_name === serverParam);
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
                if (!selectedEpisode && serverParam && validEpisodes.length > 0) {
                    const targetServer = validEpisodes.find(s => s.server_name === serverParam);
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

                    // Mark initialization done - serverParam won't affect future source changes
                    hasInitialized.current = true;
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

        // Phát sự kiện chuyển tập cho các Guest trong phòng xem chung (chỉ Host mới gửi được lên server)
        if (socket && roomParam) {
            socket.emit('wp_change_episode', { roomId: roomParam, serverName, episodeSlug: episode.slug });
        }


        // Restore time if switching versions of the same episode
        if (isSameEpisode) {
            setStartTime(playerTime);
        } else {
            setStartTime(0);
        }

        // Update URL - encode server name to hide internal names
        const encodedServer = encodeServerForUrl(serverName);
        const newUrl = `/movie/${slug}/watch?episode=${episode.slug}&server=${encodedServer}`;
        window.history.replaceState({}, '', newUrl);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSourceChange = (newSource: string) => {
        if (newSource === currentSource) return;

        setCurrentSource(newSource);

        // Auto-switch to same episode on new source if we have a currentEpisode
        if (movie?.episodes) {
            const prefixMap: Record<string, string> = {
                'Server 1': 'KK -',
                'Server 2': 'OP -'
            };
            const prefix = prefixMap[newSource] || '';

            const targetServers = movie.episodes.filter((ep: Episode) => {
                if (ep.isHidden) return false;
                if (ep.server_name.startsWith('NC -') || ep.server_name === 'PChill Server') return false; 
                
                if (newSource === 'PChill VIP 1') {
                    return ep.server_name.includes('PChill - Seekstreaming');
                }
                if (newSource === 'PChill VIP 2') {
                    return ep.server_name.includes('PChill - Play4Me');
                }
                if (newSource === 'Khác') {
                    return !ep.server_name.startsWith('KK -') &&
                        !ep.server_name.startsWith('OP -') &&
                        !ep.server_name.startsWith('PChill');
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

    const handlePlayerError = () => {
        if (!currentSource) return;

        // Auto failover strategy
        let fallbackSource: string | null = null;

        if (currentSource === 'PChill VIP 1') {
            fallbackSource = availableSources.includes('PChill VIP 2') ? 'PChill VIP 2' : (availableSources.includes('Server 1') ? 'Server 1' : null);
        } else if (currentSource === 'PChill VIP 2') {
            fallbackSource = availableSources.includes('PChill VIP 1') ? 'PChill VIP 1' : (availableSources.includes('Server 1') ? 'Server 1' : null);
        } else if (currentSource !== 'Server 1' && availableSources.includes('Server 1')) {
            fallbackSource = 'Server 1';
        }

        if (fallbackSource) {
            toast.error(`Trình phát ${currentSource} đang gặp sự cố. Đang tự động chuyển sang ${fallbackSource}...`, { id: 'player-error', duration: 4000 });
            handleSourceChange(fallbackSource);
        } else {
            toast.error(`Trình phát ${currentSource} đang gặp sự cố. Xin vui lòng thử lại sau.`, { id: 'player-error-fatal' });
        }
    };

    const getCleanServerName = (rawName: string) => {
        if (!rawName) return '';

        const lowerName = rawName.toLowerCase();

        // 0. Map VIP Servers
        if (lowerName.includes('abyss')) return 'PChill VIP 1';
        if (lowerName.includes('play4me')) return 'PChill VIP 2';

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
                    <div className="flex items-center gap-2 md:gap-4">
                        {roomParam ? (
                            // Đã tạo phòng → hiện nút Share
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast.success('Đã sao chép link phòng! Gửi cho bạn bè cùng xem 🎉');
                                }}
                                className="flex items-center bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50 text-xs font-bold gap-1 md:gap-2 px-2 py-1.5 md:px-3 md:py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                                <Share2 className="w-3 h-3 md:w-4 md:h-4" />
                                <span className="hidden sm:inline">Chia sẻ phòng</span>
                                <span className="sm:hidden">Chia sẻ</span>
                            </button>
                        ) : (
                            // Chưa tạo phòng → hiện nút Tạo
                            <button 
                                onClick={() => {
                                    if (!user) {
                                        toast.error('Vui lòng đăng nhập để tạo phòng');
                                        return;
                                    }
                                    const roomId = Math.random().toString(36).substring(2, 9);
                                    router.push(`?room=${roomId}`, { scroll: false });
                                    toast.success('Đã tạo phòng! Chia sẻ link để bạn bè cùng xem 🎉');
                                }}
                                className="flex items-center bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50 text-xs font-bold gap-1 md:gap-2 px-2 py-1.5 md:px-3 md:py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                                <Users className="w-3 h-3 md:w-4 md:h-4" />
                                <span className="hidden sm:inline">Tạo phòng chung</span>
                                <span className="sm:hidden">Tạo phòng</span>
                            </button>
                        )}
                        <div className="hidden md:block">
                            <DonateButton />
                        </div>
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

            <div className="container mx-auto px-0 md:px-4 py-4 md:py-6 max-lg:landscape:py-2 flex flex-col max-lg:landscape:flex-row lg:flex-row gap-4 max-lg:landscape:gap-2 lg:gap-6">

                {/* 1. MAIN PLAYER (Left/Top) */}
                <div className="flex-1 w-full min-w-0">

                    {/* AD BANNER (Non-Premium) */}
                    <div className="mb-4">
                        <PWAAds variant="watch" />
                    </div>

                    <div className="aspect-video w-full bg-black md:rounded-xl overflow-visible shadow-2xl border-t border-b md:border border-white/10 relative">
                        {/* VIP Lock Overlay */}
                        {currentSource.startsWith('PChill VIP') && !user?.isVip && !(currentSource === 'PChill VIP 2' && user?.isPremium) ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-black/95 rounded-xl gap-2 md:gap-3 text-center p-4 z-50 absolute top-0 left-0">
                                <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                                    <Crown className="w-6 h-6 text-yellow-400" />
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-bold text-white mb-0.5">Nội dung dành riêng cho VIP</h3>
                                    <p className="text-gray-400 text-xs md:text-sm max-w-[280px] md:max-w-sm mx-auto leading-relaxed">
                                        Máy chủ <span className="text-yellow-400 font-bold">{currentSource}</span> yêu cầu tài khoản <span className="text-yellow-400 font-bold">PChill VIP</span>. Nâng cấp để mở khóa.
                                    </p>
                                </div>
                                <a
                                    href="/pricing"
                                    className="px-4 py-1.5 md:py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs md:text-sm rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-yellow-500/20 mt-1"
                                >
                                    <Crown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    Nâng cấp VIP ngay
                                </a>
                                <button
                                    onClick={() => handleSourceChange('Server 1')}
                                    className="text-[10px] md:text-xs text-gray-500 hover:text-gray-300 transition-colors z-[60] relative mt-1"
                                >
                                    Tiếp tục xem Server miễn phí →
                                </button>
                            </div>
                        ) : currentEpisode ? (
                            <VideoPlayer
                                socket={socket}
                                roomId={roomParam}
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
                                onError={handlePlayerError}
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
                                onShareMoment={(time) => setMomentTime(time)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface-900">
                                <p className="text-gray-500">Đang tải player...</p>
                            </div>
                        )}
                    </div>

                    {/* Source Selector & Meta below player */}
                    <div className="mt-4 max-lg:landscape:mt-2 px-4 md:px-0 space-y-4 max-lg:landscape:space-y-2">
                        <div className="flex flex-col sm:flex-row max-lg:landscape:flex-col sm:items-center max-lg:landscape:items-start justify-between gap-4 max-lg:landscape:gap-2 bg-surface-900/50 p-4 max-lg:landscape:p-2 rounded-xl border border-white/5">
                            <div className="min-w-0">
                                <h1 className="text-xl max-lg:landscape:text-base font-bold text-primary mb-1 max-lg:landscape:mb-0 truncate">{movie.name}</h1>
                                <p className="text-sm max-lg:landscape:text-xs text-gray-400 truncate">
                                    {movie.origin_name} • {movie.year}
                                    {currentEpisode && (
                                        <>
                                            {' • '}
                                            <span className="text-white font-medium">{currentEpisode.name}</span>
                                            {currentServerName && (
                                                <>
                                                    {' • '}
                                                    <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold">
                                                        {currentSource}
                                                    </span>
                                                </>
                                            )}
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* Report & Donate Buttons - Mobile and Tablet */}
                            <div className="flex md:hidden max-lg:landscape:flex items-center gap-2 shrink-0 mt-3 sm:mt-0 max-lg:landscape:mt-2">
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

                        {/* Source Tabs - Hidden on desktop (moved to sidebar) - 2 ROW LAYOUT */}
                        {availableSources.length > 0 && (() => {
                            const freeSources = availableSources.filter(s => !s.startsWith('PChill VIP'));
                            const vipSources = availableSources.filter(s => s.startsWith('PChill VIP'));
                            const renderBtn = (source: string) => {
                                const isVipSource = source.startsWith('PChill VIP');
                                // const canAccess = !isVipSource || user?.isVip || (source === 'PChill VIP 2' && user?.isPremium);
                                const canAccess = true; // Temporarily allow all access
                                const lockedTitle = source === 'PChill VIP 2' ? 'Dành cho thành viên Premium & VIP' : 'Chỉ dành cho thành viên PChill VIP';
                                return (
                                    <button
                                        key={source}
                                        onClick={() => canAccess ? handleSourceChange(source) : null}
                                        title={!canAccess ? lockedTitle : ''}
                                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                                            currentSource === source
                                                ? isVipSource ? 'bg-yellow-500 text-black shadow-md' : 'bg-primary text-black shadow-md shadow-primary/20'
                                                : isVipSource
                                                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20'
                                                    : 'bg-surface-800 text-gray-400 hover:bg-surface-700 hover:text-white border border-white/5'
                                            }`}
                                    >
                                        {isVipSource && <Crown className="w-3 h-3" />}
                                        {!canAccess && <Lock className="w-3 h-3" />}
                                        {source}
                                    </button>
                                );
                            };
                            return (
                                <div className="lg:hidden max-lg:landscape:hidden flex flex-col gap-1.5">
                                    {freeSources.length > 0 && (
                                        <div className="flex items-center gap-1.5 overflow-x-auto">
                                            <span className="text-[10px] font-bold text-gray-600 uppercase shrink-0 w-10">Free</span>
                                            {freeSources.map(renderBtn)}
                                        </div>
                                    )}
                                    {vipSources.length > 0 && (
                                        <div className="flex items-center gap-1.5 overflow-x-auto">
                                            <span className="text-[10px] font-bold text-yellow-700 uppercase shrink-0 w-10">VIP</span>
                                            {vipSources.map(renderBtn)}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* 2. EPISODE SIDEBAR (Right/Bottom) */}
                <div className="w-full max-lg:landscape:w-64 lg:w-96 px-4 md:px-0 space-y-4 max-lg:landscape:space-y-2 shrink-0">
                    <div className="bg-surface-900/30 rounded-xl border border-white/5 overflow-hidden flex flex-col h-full lg:sticky lg:top-24">
                        <div className="p-4 max-lg:landscape:p-2 border-b border-white/5 bg-surface-900/80 backdrop-blur-sm space-y-3 max-lg:landscape:space-y-1.5">
                            <h3 className="font-bold text-white flex items-center gap-2 max-lg:landscape:text-sm">
                                <Play className="w-4 h-4 max-lg:landscape:w-3 max-lg:landscape:h-3 text-primary fill-current" />
                                Danh Sách Tập
                            </h3>
                            {/* Source Tabs - Desktop only (inside sidebar) - 2 ROW LAYOUT */}
                            {availableSources.length > 0 && (() => {
                                const freeSources = availableSources.filter(s => !s.startsWith('PChill VIP'));
                                const vipSources = availableSources.filter(s => s.startsWith('PChill VIP'));
                                const renderBtn = (source: string) => {
                                    const isVipSource = source.startsWith('PChill VIP');
                                    // const canAccess = !isVipSource || user?.isVip || (source === 'PChill VIP 2' && user?.isPremium);
                                    const canAccess = true; // Temporarily allow all access
                                    const lockedTitle = source === 'PChill VIP 2' ? 'Dành cho thành viên Premium & VIP' : 'Chỉ dành cho thành viên PChill VIP';
                                    return (
                                        <button
                                            key={source}
                                            onClick={() => canAccess ? handleSourceChange(source) : null}
                                            title={!canAccess ? lockedTitle : ''}
                                            className={`px-3 py-1 max-lg:landscape:px-2 max-lg:landscape:py-0.5 rounded-md text-xs max-lg:landscape:text-[10px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 max-lg:landscape:gap-1 ${
                                                currentSource === source
                                                    ? isVipSource ? 'bg-yellow-500 text-black shadow-md' : 'bg-primary text-black shadow-md shadow-primary/20'
                                                    : isVipSource
                                                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20'
                                                        : 'bg-surface-700 text-gray-400 hover:bg-surface-600 hover:text-white border border-white/5'
                                                }`}
                                        >
                                            {isVipSource && <Crown className="w-3 h-3 max-lg:landscape:w-2.5 max-lg:landscape:h-2.5" />}
                                            {!canAccess && <Lock className="w-3 h-3 max-lg:landscape:w-2.5 max-lg:landscape:h-2.5" />}
                                            {source}
                                        </button>
                                    );
                                };
                                return (
                                    <div className="hidden lg:flex max-lg:landscape:flex flex-col gap-1.5">
                                        {freeSources.length > 0 && (
                                            <div className="flex items-center gap-1.5 flex-wrap max-lg:landscape:flex-nowrap max-lg:landscape:overflow-x-auto max-lg:landscape:[&::-webkit-scrollbar]:hidden max-lg:landscape:[-ms-overflow-style:none] max-lg:landscape:[scrollbar-width:none]">
                                                <span className="text-[10px] font-bold text-gray-600 uppercase w-10 shrink-0">Free</span>
                                                {freeSources.map(renderBtn)}
                                            </div>
                                        )}
                                        {vipSources.length > 0 && (
                                            <div className="flex items-center gap-1.5 flex-wrap max-lg:landscape:flex-nowrap max-lg:landscape:overflow-x-auto max-lg:landscape:[&::-webkit-scrollbar]:hidden max-lg:landscape:[-ms-overflow-style:none] max-lg:landscape:[scrollbar-width:none]">
                                                <span className="text-[10px] font-bold text-yellow-700 uppercase w-10 shrink-0">VIP</span>
                                                {vipSources.map(renderBtn)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-4 max-lg:landscape:p-2 flex-1 space-y-4 max-lg:landscape:space-y-2 flex flex-col">
                            {/* Server/Category Horizontal Tabs */}
                            {filteredServers.length > 0 && !currentSource.startsWith('PChill VIP') && (
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar border-b border-white/10 shrink-0">
                                    {filteredServers.map((server) => {
                                        const cleanName = getCleanServerName(server.server_name);
                                        const isActiveTab = viewingServerName === server.server_name;
                                        return (
                                            <button
                                                key={`tab-${server.server_name}`}
                                                onClick={() => setViewingServerName(server.server_name)}
                                                className={`px-4 py-2 max-lg:landscape:px-2 max-lg:landscape:py-1 text-sm max-lg:landscape:text-xs font-bold whitespace-nowrap rounded-t-lg transition-all border-b-2 ${isActiveTab
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

                            {/* Episodes Grid for the active tab - sorted numerically */}
                            {filteredServers.map((server) => {
                                if (server.server_name !== viewingServerName) return null;
                                // Sort episodes: extract leading number from name for correct 1,2,3...10,11 order
                                const extractEpNum = (name: string) => {
                                    const m = name.match(/(\d+)/);
                                    return m ? parseInt(m[1]) : 0;
                                };
                                const sortedData = [...server.server_data].sort((a, b) =>
                                    extractEpNum(a.name) - extractEpNum(b.name)
                                );
                                return (
                                    <div key={server.server_name} className="flex-1">
                                        <div className="grid grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-lg:landscape:gap-1">
                                            {sortedData.map((ep: { slug: string; name: string; link_m3u8: string; link_embed: string; time_intro?: number[]; time_outro?: number[] }) => {
                                                const isPlaying = currentEpisode?.slug === ep.slug && currentServerName === server.server_name;
                                                return (
                                                    <button
                                                        key={ep.slug}
                                                        onClick={() => handleEpisodeClick(server.server_name, ep)}
                                                        className={`px-2 py-3 max-lg:landscape:py-1.5 text-xs max-lg:landscape:text-[10px] font-medium rounded-lg transition-all border relative flex items-center justify-center ${isPlaying
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
                <div className="max-w-7xl mx-auto w-full px-1 md:px-6 pb-12 max-lg:landscape:px-4 max-lg:landscape:pb-24">
                    <div className="mt-8 max-lg:landscape:mt-12 bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between bg-surface-900/80 p-1 md:p-1.5 border-b border-white/5 gap-2 md:gap-0">
                            <div className="px-3 md:px-6 py-1.5 md:py-2">
                                <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                                    Mọi người đang nói gì?
                                </h3>
                            </div>
                            <div className="flex p-0.5 bg-black/20 rounded-2xl md:mr-2">
                                <button
                                    onClick={() => setShowTabs('comment')}
                                    className={`flex-1 md:flex-none md:min-w-[140px] py-1.5 md:py-2 px-3 md:px-6 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${showTabs === 'comment' ? "bg-primary text-black shadow-lg" : "text-gray-500 hover:text-white"}`}
                                >
                                    Bình luận
                                </button>
                                <button
                                    onClick={() => setShowTabs('rating')}
                                    className={`flex-1 md:flex-none md:min-w-[140px] py-1.5 md:py-2 px-3 md:px-6 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${showTabs === 'rating' ? "bg-primary text-black shadow-lg" : "text-gray-500 hover:text-white"}`}
                                >
                                    Đánh giá
                                </button>
                            </div>
                        </div>
                        <div className="px-0 py-3 md:p-6">
                            {showTabs === 'comment' ? (
                                <CommentSection
                                    key={`comment-${refreshComments}`}
                                    movieSlug={movie.slug}
                                    episodeName={currentEpisode?.name}
                                    type="comment"
                                    hideRatingForm={true}
                                    onSeek={(time) => {
                                        setStartTime(time);
                                        // Scroll up to player smoothly
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
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
            
            {momentTime !== null && (
                <ShareMomentModal
                    movieSlug={movie.slug}
                    episodeName={currentEpisode?.name}
                    timestamp={momentTime}
                    onClose={() => setMomentTime(null)}
                    onSuccess={() => setRefreshComments(prev => prev + 1)}
                />
            )}
        </div>
    );
}
