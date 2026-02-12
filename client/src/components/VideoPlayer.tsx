'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    Settings, Loader2, FastForward, Rewind
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useWatchProgress } from '@/hooks/useWatchProgress';

interface VideoPlayerProps {
    src: string;
    poster?: string;
    embedUrl?: string;
    autoPlay?: boolean;
    movieSlug?: string;
    movieName?: string;
    movieThumb?: string;
    episodeSlug?: string;
    episodeName?: string;
    serverName?: string;
    startTime?: number;  // Optional start time from URL param
}

const formatTime = (seconds: number) => {
    if (!seconds) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function VideoPlayer({
    src,
    poster,
    embedUrl,
    autoPlay,
    movieSlug,
    movieName,
    movieThumb,
    episodeSlug,
    episodeName,
    serverName,
    startTime = 0
}: VideoPlayerProps) {
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [useEmbed] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPosition, setHoverPosition] = useState<number>(0);

    // Quality State
    const [qualityLevels, setQualityLevels] = useState<{ height: number; bitrate: number; index: number }[]>([]);
    const [currentQuality, setCurrentQuality] = useState(-1); // -1 is Auto
    const [showSettings, setShowSettings] = useState(false);

    // Timer for hiding controls
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Watch Progress Hook
    const { initialProgress, debouncedSave } = useWatchProgress({
        movieSlug,
        movieName,
        movieThumb,
        episodeSlug,
        episodeName,
        serverName
    });

    // -- Logic --

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            const dur = videoRef.current.duration || 0;
            setCurrentTime(time);
            setDuration(dur);

            // Auto-save progress (debounced)
            if (user && movieSlug && episodeSlug) {
                debouncedSave(time, dur);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        const newMuted = !isMuted;
        videoRef.current.muted = newMuted;
        setIsMuted(newMuted);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        if (videoRef.current) {
            videoRef.current.volume = value;
            setVolume(value);
            setIsMuted(value === 0);
        }
    };

    // -- Mobile Gestures & Orientation --
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);
    const touchStartTimeRef = useRef<number>(0);
    const [brightness, setBrightness] = useState(1);
    const [gestureFeedback, setGestureFeedback] = useState<{ type: 'volume' | 'brightness' | 'error', value: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
        touchStartTimeRef.current = Date.now();
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartRef.current || !containerRef.current) return;

        // Gestures only active in fullscreen (landscape/zoomed)
        if (!isFullscreen && !isLandscape) return;

        // Prevent page scroll
        // e.preventDefault(); // Warning: Passive event listener issue in React?
        // Better handled via CSS touch-action: none

        const deltaY = touchStartRef.current.y - e.touches[0].clientY;
        const deltaX = e.touches[0].clientX - touchStartRef.current.x;
        const rect = containerRef.current.getBoundingClientRect();
        const sensitive = 150; // Pixels to scroll to max change

        // Ignore horizontal swipes (seeking) - threshold 30px difference
        if (Math.abs(deltaX) > Math.abs(deltaY) + 30) return;

        const percentChange = deltaY / sensitive;

        // Left side: Brightness
        if (touchStartRef.current.x < rect.width / 2) {
            const newBrightness = Math.max(0.2, Math.min(1.5, brightness + percentChange * 0.05));
            setBrightness(newBrightness);
            setGestureFeedback({ type: 'brightness', value: newBrightness });
        }
        // Right side: Volume
        else {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
            if (isIOS) {
                // iOS does not allow volume control via JS
                // Show feedback but don't change volume
                setGestureFeedback({ type: 'error', value: 0 }); // Error type for "Use Buttons"
            } else if (videoRef.current) {
                const newVolume = Math.max(0, Math.min(1, volume + percentChange * 0.05));
                videoRef.current.volume = newVolume;
                setVolume(newVolume);
                setIsMuted(newVolume === 0);
                setGestureFeedback({ type: 'volume', value: newVolume });
            }
        }
    };

    const handleTouchEnd = () => {
        touchStartRef.current = null;
        setTimeout(() => setGestureFeedback(null), 1000);
    };

    const toggleFullscreen = async () => {
        try {
            const container = containerRef.current;
            const video = videoRef.current;

            if (!container || !video) return;

            // Check if standard fullscreen calls are available on container
            const requestFS = container.requestFullscreen ||
                (container as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen ||
                (container as HTMLElement & { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen ||
                (container as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen;

            const exitFS = document.exitFullscreen ||
                (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen ||
                (document as Document & { mozCancelFullScreen?: () => Promise<void> }).mozCancelFullScreen ||
                (document as Document & { msExitFullscreen?: () => Promise<void> }).msExitFullscreen;

            // iOS Safari often doesn't support container fullscreen, acts on video element
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;

            if (!document.fullscreenElement && !(document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement) {
                // ENTER FULLSCREEN
                if (isIOS && (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
                    // Use native iOS fullscreen
                    (video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
                } else if (requestFS) {
                    // Use standard/standard-ish container fullscreen
                    await requestFS.call(container);
                    setIsFullscreen(true);

                    // Attempt Orientation Lock (Android)
                    if (screen.orientation && (screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> }).lock) {
                        try {
                            await (screen.orientation as ScreenOrientation & { lock: (orientation: string) => Promise<void> }).lock('landscape');
                        } catch {
                            console.log('Orientation lock not supported/allowed');
                        }
                    }
                }
            } else {
                // EXIT FULLSCREEN
                if (exitFS) {
                    await exitFS.call(document);
                } else if ((video as HTMLVideoElement & { webkitExitFullscreen?: () => void }).webkitExitFullscreen) {
                    (video as HTMLVideoElement & { webkitExitFullscreen: () => void }).webkitExitFullscreen();
                }
                setIsFullscreen(false);

                // Unlock Orientation
                if (screen.orientation && (screen.orientation as ScreenOrientation & { unlock?: () => void }).unlock) {
                    try { (screen.orientation as ScreenOrientation & { unlock: () => void }).unlock(); } catch { }
                }
            }

        } catch (e) {
            console.error('Fullscreen error:', e);
        }
    };

    // -- Rotation Logic (Fake Landscape for Mobile) --
    const [isLandscape, setIsLandscape] = useState(false);

    // ... existing changeSpeed/changeQuality ...

    const changeSpeed = (speed: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
            setPlaybackSpeed(speed);
            setShowSettings(false);
        }
    };

    const changeQuality = (levelIndex: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = levelIndex;
            setCurrentQuality(levelIndex);
            setShowSettings(false);
        }
    };

    // -- HLS & Init --

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (!src) {
            setError(true);
            setIsLoading(false);
            return;
        }

        setError(false);
        setIsLoading(true);
        let hls: Hls;

        const onVideoLoaded = () => setIsLoading(false);
        const onVideoWaiting = () => setIsLoading(true);
        const onVideoPlaying = () => {
            setIsLoading(false);
            setIsPlaying(true);
        };
        const onVideoPause = () => setIsPlaying(false);
        const onLoadedMetadata = () => {
            // Priority: 1. startTime from URL param, 2. saved progress
            if (startTime > 0) {
                video.currentTime = startTime;
            } else if (initialProgress !== null && initialProgress > 10) {
                video.currentTime = initialProgress;
            }
        };
        const onFullscreenChange = () => {
            const isFS = !!document.fullscreenElement || !!(document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
            setIsFullscreen(isFS);
            // If entering native TV/PC fullscreen, turn off our fake landscape
            if (isFS) setIsLandscape(false);
        };

        video.addEventListener('loadeddata', onVideoLoaded);
        video.addEventListener('waiting', onVideoWaiting);
        video.addEventListener('playing', onVideoPlaying);
        video.addEventListener('pause', onVideoPause);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);

        // Listen for fullscreen changes to update state correctly
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange); // iOS/Safari
        video.addEventListener('webkitendfullscreen', () => setIsFullscreen(false)); // iOS native exit

        if (Hls.isSupported()) {
            hls = new Hls({
                capLevelToPlayerSize: true,
                autoStartLoad: true,
            });
            hlsRef.current = hls;

            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                const levels = data.levels.map((level, index) => ({
                    index,
                    height: level.height,
                    bitrate: level.bitrate,
                    name: level.name || (level.height ? `${level.height}p` : 'Source')
                }));
                levels.sort((a, b) => b.height - a.height);
                setQualityLevels(levels);
                setIsLoading(false);
                if (autoPlay) {
                    video.play().catch(() => {
                        setIsMuted(true);
                        video.muted = true;
                        video.play();
                    });
                }
            });

            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            hls.destroy();
                            setError(true);
                            break;
                    }
                }
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            if (autoPlay) {
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(() => {
                        setIsMuted(true);
                        video.muted = true;
                        video.play();
                    });
                });
            }
        }

        return () => {
            if (hls) hls.destroy();
            video.removeEventListener('loadeddata', onVideoLoaded);
            video.removeEventListener('waiting', onVideoWaiting);
            video.removeEventListener('playing', onVideoPlaying);
            video.removeEventListener('pause', onVideoPause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            // Cleanup fullscreen listeners
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
            video.removeEventListener('webkitendfullscreen', () => setIsFullscreen(false));
        };
    }, [src, autoPlay]);


    if (error || (useEmbed && embedUrl)) {
        if (embedUrl) {
            return (
                <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-border">
                    <iframe
                        src={`${embedUrl}${autoPlay ? '?autoplay=1' : ''}`}
                        className="w-full h-full"
                        frameBorder="0"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                </div>
            );
        }
        return (
            <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center border border-border rounded-lg gap-4">
                <p className="text-red-500">Lỗi: Không thể tải tập phim này.</p>
                <Button onClick={() => window.location.reload()} variant="outline">Tải lại trang</Button>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className={`relative bg-black border border-border shadow-2xl shadow-primary/10 group select-none overflow-hidden transition-all duration-300
                ${isLandscape
                    ? 'fixed inset-0 z-9999 w-[100vh] h-[100vw] rotate-90 origin-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-none'
                    : 'w-full h-full rounded-lg'
                }`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
            onClick={togglePlay}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                filter: `brightness(${brightness})`,
                touchAction: 'none' // Important for gestures
            }}
        >
            <video
                ref={videoRef}
                poster={poster}
                className="w-full h-full object-contain"
                playsInline
                autoPlay={autoPlay}
            />

            {/* Gesture Feedback Overlay */}
            {gestureFeedback && (
                <div className={`absolute inset-0 flex items-center justify-center z-40 pointer-events-none ${isLandscape ? '-rotate-90' : ''}`}>
                    <div className="bg-black/50 backdrop-blur-sm p-4 rounded-xl text-white flex flex-col items-center gap-2">
                        {gestureFeedback.type === 'volume' ? <Volume2 className="w-8 h-8" /> :
                            gestureFeedback.type === 'brightness' ? <Loader2 className="w-8 h-8 animate-spin" /> : // Should use Sun icon really but reusing loader for now or check type
                                <VolumeX className="w-8 h-8 text-red-500" /> // Error icon
                        }

                        <span className="text-xl font-bold">
                            {gestureFeedback.type === 'brightness' ? 'Độ sáng' :
                                gestureFeedback.type === 'volume' ? 'Âm lượng' :
                                    'Dùng phím cứng'}
                        </span>

                        {gestureFeedback.type !== 'error' && (
                            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-75"
                                    style={{
                                        width: `${gestureFeedback.type === 'brightness' ? (gestureFeedback.value / 1.5) * 100 : gestureFeedback.value * 100}%`
                                    }}
                                />
                            </div>
                        )}
                        {gestureFeedback.type === 'error' && (
                            <span className="text-xs text-center text-gray-300">iPhone không hỗ trợ<br />chỉnh âm lượng cảm ứng</span>
                        )}
                    </div>
                </div>
            )}

            {/* Loading Spinner */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 pointer-events-none">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            )}

            {/* Controls Overlay */}
            <div className={`absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 transition-opacity duration-300 z-10 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>

                {/* Progress Bar */}
                <div
                    className="w-full mb-4 flex items-center gap-2 group/progress relative"
                    onClick={(e) => e.stopPropagation()}
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;
                        const time = percentage * duration;
                        setHoverTime(time);
                        setHoverPosition(percentage * 100);
                    }}
                    onMouseLeave={() => setHoverTime(null)}
                >
                    {/* Time Preview Tooltip */}
                    {hoverTime !== null && (
                        <div
                            className="absolute bottom-full mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded pointer-events-none z-50"
                            style={{ left: `${hoverPosition}%`, transform: 'translateX(-50%)' }}
                        >
                            {formatTime(hoverTime)}
                        </div>
                    )}
                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary transition-all group-hover/progress:h-2"
                        style={{
                            background: `linear-gradient(to right, #D4AF37 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%)`
                        }}
                    />
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 md:gap-4">
                        <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:text-primary hover:bg-transparent">
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }} className="hidden md:flex text-white/70 hover:text-white hover:bg-transparent">
                            <Rewind className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }} className="hidden md:flex text-white/70 hover:text-white hover:bg-transparent">
                            <FastForward className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-2 group/volume">
                            <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:text-primary hover:bg-transparent">
                                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </Button>
                            {/* Hide volume slider on mobile, show on hover/group on desktop */}
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.1}
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="hidden md:block w-0 overflow-hidden group-hover/volume:w-20 transition-all h-1 bg-white/30 rounded-lg cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                            />
                        </div>

                        <span className="text-white text-xs font-mono ml-2 whitespace-nowrap">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Settings Button logic */}
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowSettings(!showSettings)}
                                className={`text-white hover:text-primary hover:bg-transparent ${showSettings ? 'rotate-90 text-primary' : ''} transition-all`}
                            >
                                <Settings className="w-5 h-5" />
                            </Button>


                            {/* Settings Popup */}
                            {showSettings && (
                                <div className={`absolute bottom-12 right-0 bg-black/90 border border-white/20 rounded-lg p-3 min-w-50 text-white space-y-3 ${isLandscape ? '-rotate-90 origin-bottom-right translate-x-full' : ''}`}>
                                    {/* Speed */}
                                    <div>
                                        <p className="text-xs text-secondary/70 mb-2 uppercase font-bold">Tốc độ</p>
                                        <div className="grid grid-cols-4 gap-1">
                                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                                <button
                                                    key={speed}
                                                    onClick={() => changeSpeed(speed)}
                                                    className={`text-xs p-1 rounded ${playbackSpeed === speed ? 'bg-primary text-black' : 'hover:bg-white/10'}`}
                                                >
                                                    {speed}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quality */}
                                    {qualityLevels.length > 0 && (
                                        <div>
                                            <p className="text-xs text-secondary/70 mb-2 uppercase font-bold">Chất lượng</p>
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => changeQuality(-1)}
                                                    className={`text-xs text-left p-1.5 rounded ${currentQuality === -1 ? 'bg-primary text-black' : 'hover:bg-white/10'}`}
                                                >
                                                    Tự động
                                                </button>
                                                {qualityLevels.map(level => (
                                                    <button
                                                        key={level.index}
                                                        onClick={() => changeQuality(level.index)}
                                                        className={`text-xs text-left p-1.5 rounded ${currentQuality === level.index ? 'bg-primary text-black' : 'hover:bg-white/10'}`}
                                                    >
                                                        {level.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Mobile Rotate Button (Force Landscape) - Removed per request */}
                        {/* <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleLandscape}
                            className={`text-white hover:text-primary hover:bg-transparent md:hidden ${isLandscape ? 'text-primary' : ''}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                            </svg>
                        </Button> */}

                        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:text-primary hover:bg-transparent">
                            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
