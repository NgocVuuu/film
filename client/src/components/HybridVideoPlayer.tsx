'use client';

import { useEffect, useState, useRef } from 'react';
import { MediaPlayer, MediaProvider, Poster, Track, type MediaPlayerInstance, type MediaTimeUpdateEvent } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons, type DefaultLayoutTranslations } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import axios from 'axios';
import { API_URL } from '@/lib/config';
import { useAuth } from '@/contexts/auth-context';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { Loader2, AlertCircle } from 'lucide-react';

interface HybridVideoPlayerProps {
    src: string; // Default HLS source
    magnet?: string; // Torrent magnet link for Premium
    poster?: string;
    autoPlay?: boolean;
    movieSlug?: string;
    movieName?: string;
    movieThumb?: string;
    episodeSlug?: string;
    episodeName?: string;
    serverName?: string;
    startTime?: number;
    subtitles?: { lang: string; url: string; label: string; default?: boolean }[];
    onEnded?: () => void;
    onNextEpisode?: () => void;
    onPrevEpisode?: () => void;
    onTimeUpdate?: (time: number) => void;
}

const vietnameseTranslations: Partial<DefaultLayoutTranslations> = {
    Play: 'Phát',
    Pause: 'Tạm dừng',
    Replay: 'Phát lại',
    Mute: 'Tắt tiếng',
    Unmute: 'Bật tiếng',
    'Enter Fullscreen': 'Toàn màn hình',
    'Exit Fullscreen': 'Thoát toàn màn hình',
    'Enter PiP': 'Giảm kích thước',
    'Exit PiP': 'Tắt giảm kích thước',
    Settings: 'Cài đặt',
    Audio: 'Âm thanh',
    Captions: 'Phụ đề đóng',
    Quality: 'Chất lượng',
    Speed: 'Tốc độ',
    Normal: 'Bình thường',
    Auto: 'Tự động',
    'Closed-Captions On': 'Bật',
    'Closed-Captions Off': 'Tắt',
    Volume: 'Âm lượng',
    Chapters: 'Chương',
    Default: 'Mặc định',
};

const HybridVideoPlayer = ({
    src,
    magnet,
    poster,
    autoPlay,
    movieSlug,
    movieName,
    movieThumb,
    episodeSlug,
    episodeName,
    serverName,
    startTime = 0,
    subtitles = [],
    onEnded,
    onNextEpisode,
    onPrevEpisode,
    onTimeUpdate
}: HybridVideoPlayerProps) => {
    const { user } = useAuth();
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [currentKeyId, setCurrentKeyId] = useState<string | null>(null); // Lưu trữ RD Key ID hiện tại để báo lỗi
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isNetworkDowngraded, setIsNetworkDowngraded] = useState(false);
    const playerRef = useRef<MediaPlayerInstance>(null);
    const bufferCountRef = useRef<number>(0);
    const bufferStartTimeRef = useRef<number>(0);
    const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);
    const bufferResetTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Watch Progress Hook
    const { debouncedSave } = useWatchProgress({
        movieSlug,
        movieName,
        movieThumb,
        episodeSlug,
        episodeName,
        serverName
    });

    useEffect(() => {
        const fetchPremiumLink = async () => {
            if (!magnet || !user || user.subscription?.tier !== 'premium') {
                setStreamUrl(src); // Fallback to default HLS
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const response = await axios.get(`${API_URL}/api/torrent/stream`, {
                    params: { magnet },
                    withCredentials: true
                });

                if (response.data.success && response.data.data.streamUrl) {
                    setStreamUrl(response.data.data.streamUrl);
                    if (response.data.data.keyId) {
                        setCurrentKeyId(response.data.data.keyId);
                    }
                } else {
                    console.warn('[HybridPlayer] Failed to get premium link, falling back to HLS');
                    setStreamUrl(src);
                }
            } catch (err: any) {
                console.error('[HybridPlayer] Real-Debrid Error:', err);
                setError(err.response?.data?.message || 'Không thể khởi tạo luồng Torrent. Đang dùng luồng dự phòng...');
                setStreamUrl(src); // Fallback on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchPremiumLink();
    }, [magnet, src, user]);

    const handleTimeUpdate = (detail: any) => {
        const { currentTime } = detail;
        const duration = playerRef.current?.state.duration || 0;
        if (onTimeUpdate) onTimeUpdate(currentTime);
        if (user && movieSlug && episodeSlug) {
            debouncedSave(currentTime, duration);
        }
    };

    const handlePlayerError = async (event: any) => {
        const errorDetail = event.detail || {};
        console.error('[VideoPlayer] Phát hiện lỗi Error Event đứt gãy luồng:', errorDetail);

        // Tự động giải cứu Domino & DPI: Nếu Video sập (Mã 424 từ Nginx) hoặc bị Nhà mạng chặn Tên miền (Network Error)
        if (user?.subscription?.tier === 'premium' && magnet && currentKeyId) {

            // Nhận diện lỗi mạng (Nghi ngờ DPI chặn tên miền)
            const isNetworkError = event.detail?.code === 2 || event.detail?.code === 'MEDIA_ERR_NETWORK' || String(errorDetail?.message || '').toLowerCase().includes('network');

            if (isNetworkError) {
                console.warn(`[VideoPlayer] Trigger Fallback Cấp cứu DPI: Bị nhà mạng chặn mạng, đổi Tên miền dự phòng...`);
            } else {
                console.warn(`[VideoPlayer] Trigger Fallback Cấp cứu 424: Gạch bỏ API Key ID ${currentKeyId} và Cấp mới Token JWT...`);
            }

            try {
                // Giữ nguyên thời gian đang xem
                const currentTime = playerRef.current?.state.currentTime || 0;

                const response = await axios.get(`${API_URL}/api/torrent/fallback`, {
                    params: { magnet, deadKeyId: currentKeyId, isNetworkError: isNetworkError ? 'true' : 'false' },
                    withCredentials: true
                });

                if (response.data.success && response.data.data.streamUrl) {
                    console.log('[VideoPlayer] Hoán đổi Fallback Thành Công. Đang tiếp tục phim...');
                    setStreamUrl(response.data.data.streamUrl);
                    if (response.data.data.keyId) {
                        setCurrentKeyId(response.data.data.keyId);
                    }

                    // Force Video Player khôi phục thời gian đang xem
                    setTimeout(() => {
                        if (playerRef.current) {
                            playerRef.current.currentTime = currentTime;
                            playerRef.current.play();
                        }
                    }, 500);
                }
            } catch (fallbackErr) {
                console.error('[VideoPlayer] Fallback Reroute cũng thất bại thảm hại:', fallbackErr);
            }
        }
    };

    // [PHASE 4 Red Team] Adaptive Bitrate Fallback Logic - Tránh nghẽn mạng 4G
    const handleWaiting = () => {
        // Chỉ kích hoạt Fallback nếu đang xem luồng 4K Torrent
        if (streamUrl === src || !magnet) return;

        console.log('[AdaptiveFallback] Đang tải luồng đệm (Buffering)...');
        bufferCountRef.current += 1;
        bufferStartTimeRef.current = Date.now();

        // 1. Phân tích: Buffering quá 3 lần trong vòng 60s
        if (bufferCountRef.current >= 3) {
            triggerQualityFallback("buffering_count");
            return;
        }

        // Reset bộ đếm số lần buffer sau 60 giây nếu mạng ổn định trở lại
        if (bufferResetTimerRef.current) clearTimeout(bufferResetTimerRef.current);
        bufferResetTimerRef.current = setTimeout(() => {
            bufferCountRef.current = 0;
        }, 60000);

        // 2. Phân tích: Thời gian Buffer liên tục quá 10 giây
        if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = setTimeout(() => {
            triggerQualityFallback("buffering_timeout");
        }, 10000);
    };

    const handlePlaying = () => {
        // Khi video phát mượt trở lại, dập tắt bộ đếm thời gian timeout
        if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };

    const triggerQualityFallback = (reason: string) => {
        if (isNetworkDowngraded || streamUrl === src) return;

        console.warn(`[AdaptiveFallback] Phát hiện mạng yếu (${reason}). Tự động hạ độ phân giải xuống luồng HLS 1080p tĩnh.`);

        setIsNetworkDowngraded(true);
        setError("Mạng yếu, hệ thống đã tự động chuyển sang luồng dự phòng 1080p để đảm bảo độ mượt mà.");

        // Hoán đổi ngay vòi phát dự phòng
        const currentTime = playerRef.current?.state.currentTime || 0;
        setStreamUrl(src); // Hạ cấp

        // Force Video Player khôi phục thời gian đang xem
        setTimeout(() => {
            if (playerRef.current) {
                playerRef.current.currentTime = currentTime;
                playerRef.current.play();
                // Ẩn thông báo sau 5 giây
                setTimeout(() => setError(null), 5000);
            }
        }, 500);
    };

    if (isLoading && !streamUrl) {
        return (
            <div className="w-full aspect-video bg-black flex flex-col items-center justify-center rounded-xl border border-white/10">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-white/70 text-sm animate-pulse">Đang chuẩn bị luồng Torrent VIP...</p>
            </div>
        );
    }

    return (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group">
            {error && (
                <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-red-500/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <MediaPlayer
                ref={playerRef}
                title={movieName}
                src={streamUrl || src}
                poster={poster}
                className="w-full h-full"
                autoPlay={autoPlay}
                currentTime={startTime}
                onTimeUpdate={handleTimeUpdate}
                onEnded={onEnded}
                onError={handlePlayerError}
                onWaiting={handleWaiting}
                onPlaying={handlePlaying}
                playsInline
                crossOrigin
            >
                <MediaProvider>
                    <Poster className="vds-poster" />
                    {subtitles.map((sub, i) => (
                        <Track
                            key={i.toString()}
                            src={sub.url}
                            label={sub.label}
                            lang={sub.lang}
                            kind="subtitles"
                            default={sub.default}
                        />
                    ))}
                </MediaProvider>

                <DefaultVideoLayout
                    icons={defaultLayoutIcons}
                    translations={vietnameseTranslations}
                />

                {/* Custom Episode Navigation Overlay */}
                <div className="absolute inset-y-0 left-4 flex items-center z-10 pointer-events-none">
                    {onPrevEpisode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPrevEpisode(); }}
                            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-primary hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 pointer-events-auto shadow-xl border border-white/5"
                            title="Tập trước"
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18l-6-6 6-6v12zM19 18l-6-6 6-6v12z" /></svg>
                        </button>
                    )}
                </div>
                <div className="absolute inset-y-0 right-4 flex items-center z-10 pointer-events-none">
                    {onNextEpisode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNextEpisode(); }}
                            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-primary hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 pointer-events-auto shadow-xl border border-white/5"
                            title="Tập tiếp theo"
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M13 6l6 6-6 6V6zM5 6l6 6-6 6V6z" /></svg>
                        </button>
                    )}
                </div>
            </MediaPlayer>

            <style jsx global>{`
                /* Premium Glassmorphic Theme (Default Layout) */
                .vds-video-layout {
                    --video-brand: #eab308;
                    --video-font-family: 'Inter', sans-serif;
                    --video-controls-color: #ffffff;
                    
                    /* Menu styling */
                    --video-menu-bg: rgba(15, 15, 15, 0.7);
                    --video-menu-border: 1px solid rgba(255, 255, 255, 0.1);
                    --video-menu-backdrop-filter: blur(20px);
                    --video-menu-border-radius: 16px;
                    --video-button-hover-bg: rgba(234, 179, 8, 0.15);
                    --video-button-hover-color: #eab308;
                    
                    /* Sliders */
                    --video-slider-track-bg: rgba(255, 255, 255, 0.2);
                    --video-slider-track-fill: #eab308;
                    --video-slider-thumb-bg: #eab308;
                    --video-slider-thumb-shadow: 0 0 10px 2px rgba(234, 179, 8, 0.6);
                    
                    /* UI Controls */
                    --video-controls-bg: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0));
                    
                    -webkit-user-select: none;
                    user-select: none;
                    -webkit-touch-callout: none;
                }
                
                .vds-button {
                    transition: all 0.2s ease-in-out;
                }
                .vds-button:hover {
                    transform: scale(1.1);
                }

                .vds-poster {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .vds-poster[data-visible] {
                    opacity: 1;
                }
                
                /* Tối ưu hóa PWA trên iOS thiết bị tai thỏ */
                @media screen and (display-mode: standalone) {
                    .vds-video-layout {
                        padding-left: env(safe-area-inset-left);
                        padding-right: env(safe-area-inset-right);
                    }
                }

                .vds-poster {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .vds-poster[data-visible] {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};

export default HybridVideoPlayer;
