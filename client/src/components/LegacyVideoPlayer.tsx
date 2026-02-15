'use client';
import { useEffect, useRef, useState, memo } from 'react';
import Hls from 'hls.js';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    Settings, Loader2, FastForward, Rewind, PictureInPicture,
    SkipBack, SkipForward
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useWatchProgress } from '@/hooks/useWatchProgress';

interface WebKitVideoElement extends HTMLVideoElement {
    webkitSupportsPresentationMode?: (mode: string) => boolean;
    webkitPresentationMode?: string;
    webkitSetPresentationMode?: (mode: string) => void;
}

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
    startTime?: number;
    onEnded?: () => void;
    nextEpisodeInfo?: {
        name: string;
        serverName: string;
    };
    prevEpisodeInfo?: {
        name: string;
        serverName: string;
    };
    onNextEpisode?: () => void;
    onPrevEpisode?: () => void;
    onTimeUpdate?: (time: number) => void;
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

const LegacyVideoPlayer = ({
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
    startTime = 0,
    onEnded,
    nextEpisodeInfo,
    prevEpisodeInfo,
    onNextEpisode,
    onPrevEpisode,
    onTimeUpdate
}: VideoPlayerProps) => {
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    const prevEpisodeRef = useRef<{ movie: string, episode: string } | null>(null);
    const savedTimeRef = useRef<number>(0);

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
    const [useEmbed, setUseEmbed] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPosition, setHoverPosition] = useState<number>(0);

    const [showNextEpisode, setShowNextEpisode] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [cancelledAutoPlay, setCancelledAutoPlay] = useState(false);

    const [qualityLevels, setQualityLevels] = useState<{ height: number; bitrate: number; index: number }[]>([]);
    const [currentQuality, setCurrentQuality] = useState(-1);
    const [showSettings, setShowSettings] = useState(false);
    const [brightness, setBrightness] = useState(1);
    const [isLandscape, setIsLandscape] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'play' | 'pause'; key: number } | null>(null);

    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { initialProgress, debouncedSave } = useWatchProgress({
        movieSlug,
        movieName,
        movieThumb,
        episodeSlug,
        episodeName,
        serverName
    });

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
    };

    const safePlay = async (video: HTMLVideoElement) => {
        try {
            await video.play();
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                // Autoplay blocked - try playing muted
                video.muted = true;
                setIsMuted(true);
                try {
                    await video.play();
                } catch (mutedErr) {
                    console.error('Muted play failed:', mutedErr);
                }
            } else if (err.name === 'AbortError') {
                // Ignore AbortError as it's just an interruption
                console.log('Playback was interrupted (AbortError)');
            } else {
                console.error('Playback error:', err);
            }
        }
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setFeedback({ type: 'pause', key: Date.now() });
        } else {
            safePlay(videoRef.current);
            setFeedback({ type: 'play', key: Date.now() });
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            const dur = videoRef.current.duration || 0;
            setCurrentTime(time);
            savedTimeRef.current = time;
            setDuration(dur);
            if (onTimeUpdate) onTimeUpdate(time);
            if (user && movieSlug && episodeSlug) {
                debouncedSave(time, dur);
            }
            if (onEnded && nextEpisodeInfo && !cancelledAutoPlay && dur > 0 && dur - time <= 10 && dur - time > 0) {
                if (!showNextEpisode) {
                    setShowNextEpisode(true);
                    setCountdown(Math.ceil(dur - time));
                }
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

    const seekVideo = (seconds: number) => {
        if (!videoRef.current) return;
        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const toggleFullscreen = async () => {
        try {
            const container = containerRef.current;
            if (!container) return;
            if (!document.fullscreenElement) {
                await container.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (e) {
            console.error('Fullscreen error:', e);
        }
    };

    const togglePIP = async () => {
        try {
            const video = videoRef.current;
            if (!video) return;
            if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            }
        } catch (e) {
            console.error('PIP error:', e);
        }
    };

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

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (!src) {
            if (embedUrl) {
                setUseEmbed(true);
                setIsLoading(false);
            } else {
                setError(true);
                setIsLoading(false);
            }
            return;
        }

        setError(false);
        setIsLoading(true);
        let hls: Hls;

        const onVideoPlaying = () => {
            setIsLoading(false);
            setIsPlaying(true);
        };
        const onVideoPause = () => setIsPlaying(false);
        const onVideoEnded = () => {
            if (onEnded && !cancelledAutoPlay) onEnded();
        };
        const onLoadedMetadata = () => {
            const isSameEpisode = prevEpisodeRef.current?.movie === movieSlug &&
                prevEpisodeRef.current?.episode === episodeSlug;

            if (isSameEpisode && savedTimeRef.current > 0) {
                video.currentTime = savedTimeRef.current;
            } else if (startTime > 0) {
                video.currentTime = startTime;
            } else if (initialProgress !== null && initialProgress > 10) {
                video.currentTime = initialProgress;
            }
            prevEpisodeRef.current = { movie: movieSlug || '', episode: episodeSlug || '' };
        };

        video.addEventListener('playing', onVideoPlaying);
        video.addEventListener('pause', onVideoPause);
        video.addEventListener('ended', onVideoEnded);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);

        if (Hls.isSupported()) {
            hls = new Hls({ capLevelToPlayerSize: true });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                const levels = data.levels.map((level, index) => ({
                    index,
                    height: level.height,
                    bitrate: level.bitrate
                }));
                levels.sort((a, b) => b.height - a.height);
                setQualityLevels(levels);
                setIsLoading(false);
                if (autoPlay) safePlay(video);
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        }

        return () => {
            if (hls) hls.destroy();
            video.removeEventListener('playing', onVideoPlaying);
            video.removeEventListener('pause', onVideoPause);
            video.removeEventListener('ended', onVideoEnded);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [src, embedUrl]);

    if (error || (useEmbed && embedUrl)) {
        return (
            <div className="relative w-full h-full bg-black rounded-xl overflow-hidden border border-white/10">
                <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture"
                />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="group relative w-full h-full bg-black rounded-xl overflow-hidden border border-white/10 select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={videoRef}
                poster={poster}
                className="w-full h-full object-contain"
                playsInline
                autoPlay={autoPlay}
                onClick={togglePlay}
            />

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            )}

            {/* Play/Pause Feedback Animation */}
            {feedback && (
                <div
                    key={feedback.key}
                    onAnimationEnd={() => setFeedback(null)}
                    className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                >
                    <div className="bg-black/50 rounded-full p-6 animate-[ping-fade_0.6s_ease-out_forwards]">
                        {feedback.type === 'play' ? (
                            <Play className="w-12 h-12 text-white fill-current" />
                        ) : (
                            <Pause className="w-12 h-12 text-white fill-current" />
                        )}
                    </div>
                </div>
            )}

            {/* Next Episode Countdown */}
            {showNextEpisode && nextEpisodeInfo && !cancelledAutoPlay && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface-900 border border-primary/30 rounded-xl p-6 text-center space-y-4 shadow-2xl">
                        <div className="text-primary text-4xl font-bold">{countdown}</div>
                        <p className="text-gray-300">Tập tiếp theo sẽ phát tự động</p>
                        <p className="text-white font-bold">{nextEpisodeInfo.name}</p>
                        <Button
                            onClick={() => { setCancelledAutoPlay(true); setShowNextEpisode(false); }}
                            variant="outline"
                            className="w-full border-white/10 hover:border-primary"
                        >
                            Hủy
                        </Button>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div
                className={`absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 transition-opacity duration-300 z-10 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
                onClick={(e) => {
                    // Only toggle if clicking the overlay itself (the background), not sub-elements
                    if (e.target === e.currentTarget) {
                        togglePlay();
                    }
                }}
            >
                {/* Progress */}
                <div className="mb-4 flex items-center gap-2 group/progress relative">
                    {hoverTime !== null && (
                        <div className="absolute bottom-full mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded pointer-events-none" style={{ left: `${hoverPosition}%`, transform: 'translateX(-50%)' }}>
                            {formatTime(hoverTime)}
                        </div>
                    )}
                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary group-hover/progress:h-2 transition-all"
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const perc = x / rect.width;
                            setHoverTime(perc * duration);
                            setHoverPosition(perc * 100);
                        }}
                        onMouseLeave={() => setHoverTime(null)}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-4">
                        <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:text-primary">
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => seekVideo(-10)} className="hidden md:flex text-white/70">
                            <Rewind className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => seekVideo(10)} className="hidden md:flex text-white/70">
                            <FastForward className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                            <Button variant="ghost" size="icon" onClick={() => onPrevEpisode?.()} disabled={!onPrevEpisode} className="h-8 w-8 text-white/50 disabled:opacity-20 hover:text-white">
                                <SkipBack className="w-4 h-4 ml-[10px]" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onNextEpisode?.()} disabled={!onNextEpisode} className="h-8 w-8 text-white/50 disabled:opacity-20 hover:text-white">
                                <SkipForward className="w-4 h-4 ml-[10px]" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 group/volume">
                            <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:text-primary">
                                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </Button>
                            <input
                                type="range" min={0} max={1} step={0.1}
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="hidden md:block w-0 group-hover/volume:w-20 transition-all h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0"
                                style={{
                                    background: `linear-gradient(to right, #eab308 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`
                                }}
                            />
                        </div>
                        <span className="text-white text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className={`text-white hover:text-primary ${showSettings ? 'rotate-90' : ''}`}>
                                <Settings className="w-5 h-5" />
                            </Button>
                            {showSettings && (
                                <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-lg p-3 min-w-[200px] z-50 shadow-2xl space-y-4">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Tốc độ</p>
                                        <div className="grid grid-cols-3 gap-1">
                                            {[0.5, 1, 1.5, 2].map(s => (
                                                <button key={s} onClick={() => changeSpeed(s)} className={`text-xs p-1.5 rounded ${playbackSpeed === s ? 'bg-primary text-black' : 'hover:bg-white/10'}`}>{s}x</button>
                                            ))}
                                        </div>
                                    </div>
                                    {qualityLevels.length > 0 && (
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Chất lượng</p>
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => changeQuality(-1)} className={`text-xs text-left p-1.5 rounded ${currentQuality === -1 ? 'bg-primary text-black' : 'hover:bg-white/10'}`}>Tự động</button>
                                                {qualityLevels.map(q => (
                                                    <button key={q.index} onClick={() => changeQuality(q.index)} className={`text-xs text-left p-1.5 rounded ${currentQuality === q.index ? 'bg-primary text-black' : 'hover:bg-white/10'}`}>{q.height}p</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={togglePIP} className="text-white hover:text-primary"><PictureInPicture className="w-5 h-5" /></Button>
                        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:text-primary">{isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}</Button>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                @keyframes ping-fade {
                    0% {
                        transform: scale(0.8);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.1);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1.3);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default memo(LegacyVideoPlayer);
