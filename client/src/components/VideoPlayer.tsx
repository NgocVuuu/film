'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    Settings, Loader2, FastForward, Rewind, PictureInPicture,
    SkipBack, SkipForward, ListVideo
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
    intro?: number[];
    outro?: number[];
    startTime?: number;  // Optional start time from URL param
    onEnded?: () => void;  // Callback when video ends
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
    onError?: () => void;  // Callback when video fails to load (e.g. NC CDN blocked)
    // In-player episode panel
    episodeServers?: {
        server_name: string;
        cleanName: string;
        episodes: { slug: string; name: string }[];
    }[];
    onEpisodeSelect?: (serverName: string, episodeSlug: string) => void;
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
    intro,
    outro,
    startTime = 0,
    onEnded,
    nextEpisodeInfo,
    prevEpisodeInfo,
    onNextEpisode,
    onPrevEpisode,
    onTimeUpdate,
    episodeServers,
    onEpisodeSelect,
    onError,
}: VideoPlayerProps) {
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    // Track previous episode/movie to detect changes
    const prevEpisodeRef = useRef<{ movie: string, episode: string } | null>(null);
    const savedTimeRef = useRef<number>(0);
    const lastSeekTimeRef = useRef<number>(0);
    // Prevent onError from firing multiple times for the same src
    const onErrorFiredRef = useRef(false);

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
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubTime, setScrubTime] = useState(0);

    // Next Episode Countdown
    const [showNextEpisode, setShowNextEpisode] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [cancelledAutoPlay, setCancelledAutoPlay] = useState(false);

    // Quality State
    const [qualityLevels, setQualityLevels] = useState<{ height: number; bitrate: number; index: number }[]>([]);
    const [currentQuality, setCurrentQuality] = useState(-1); // -1 is Auto
    const [showSettings, setShowSettings] = useState(false);

    // Episode panel state
    const [showEpisodePanel, setShowEpisodePanel] = useState(false);
    const [panelServerName, setPanelServerName] = useState<string | null>(null);

    // Zoom state
    const [isZoomed, setIsZoomed] = useState(false);

    // Timer for hiding controls
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const ignoreNextClickRef = useRef(false);

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

    // Auto-hide controls effect
    useEffect(() => {
        if (isPlaying && showControls && !showSettings) {
            const timer = setTimeout(() => setShowControls(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isPlaying, showControls, showSettings]);

    const handleMouseMove = () => {
        if (!showControls) setShowControls(true);
    };

    const togglePlay = (e?: React.MouseEvent | React.TouchEvent | React.SyntheticEvent) => {
        if (e) {
            e.stopPropagation();
        }
        if (!videoRef.current) return;

        if (!videoRef.current.paused) {
            videoRef.current.pause();
        } else {
            videoRef.current.play().catch(e => {
                if (e.name !== 'AbortError') console.error('Play error:', e);
            });
        }
        setShowControls(true);
    };

    const handleContainerClick = (e: React.MouseEvent | React.TouchEvent | React.SyntheticEvent) => {
        if (e) e.stopPropagation();

        if (ignoreNextClickRef.current) {
            ignoreNextClickRef.current = false;
            return;
        }

        let handled = false;

        if (showEpisodePanel) {
            setShowEpisodePanel(false);
            handled = true;
        }

        if (showSettings) {
            setShowSettings(false);
            handled = true;
        }

        if (handled) return;

        if (!showControls && isPlaying) {
            setShowControls(true);
            return;
        }

        togglePlay(e);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            const dur = videoRef.current.duration || 0;
            setCurrentTime(time);
            // Update ref for restoring position on source change
            savedTimeRef.current = time;
            setDuration(dur);

            // SKIP INTRO LOGIC
            if (intro && intro.length === 2 && time >= intro[0] && time < intro[1]) {
                setShowSkipIntro(true);
            } else {
                setShowSkipIntro(false);
            }

            // AUTO NEXT / SKIP OUTRO LOGIC (Optional auto-skip or button)
            if (outro && outro.length === 2 && time >= outro[0] && time < outro[1]) {
                // For now, maybe just show a button or do nothing until requested
                // setShowSkipOutro(true);
            }

            if (onTimeUpdate) onTimeUpdate(time);

            // Auto-save progress (debounced)
            if (user && movieSlug && episodeSlug) {
                debouncedSave(time, dur);
            }

            // Show next episode countdown 10 seconds before end
            if (onEnded && nextEpisodeInfo && !cancelledAutoPlay && dur > 0 && dur - time <= 10 && dur - time > 0) {
                if (!showNextEpisode) {
                    setShowNextEpisode(true);
                    setCountdown(Math.ceil(dur - time));
                }
            }
        }
    };

    const handleScrubbing = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        setScrubTime(time);
        if (!isScrubbing) setIsScrubbing(true);
        if (!showControls) setShowControls(true);
    };

    const handleScrubEnd = () => {
        setIsScrubbing(false);
        if (videoRef.current) {
            videoRef.current.currentTime = scrubTime;
            setCurrentTime(scrubTime);
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        const newMuted = !videoRef.current.muted;
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
        if (!showControls) setShowControls(true);
    };

    const [showSkipIntro, setShowSkipIntro] = useState(false);

    // Seek forward/backward
    const seekVideo = (seconds: number) => {
        if (!videoRef.current) return;
        const currentVideoTime = videoRef.current.currentTime;
        const videoDuration = videoRef.current.duration || 0;
        const newTime = Math.max(0, Math.min(videoDuration, currentVideoTime + seconds));
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);

        // Show feedback
        setSeekFeedback({
            direction: seconds > 0 ? 'forward' : 'backward',
            amount: Math.abs(seconds)
        });
        setTimeout(() => setSeekFeedback(null), 500);
    };

    // -- Mobile Gestures & Orientation --
    const touchStartRef = useRef<{ x: number, y: number, pinchDist?: number } | null>(null);
    const touchStartTimeRef = useRef<number>(0);
    const [brightness, setBrightness] = useState(1);
    const [gestureFeedback, setGestureFeedback] = useState<{ type: 'volume' | 'brightness' | 'error', value: number } | null>(null);

    // Seek Feedback
    const [seekFeedback, setSeekFeedback] = useState<{ direction: 'forward' | 'backward', amount: number } | null>(null);
    const lastTapRef = useRef<{ time: number, x: number, side: 'left' | 'right' } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartRef.current = {
                x: 0,
                y: 0,
                pinchDist: Math.hypot(dx, dy)
            };
            return;
        }

        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
        touchStartTimeRef.current = Date.now();
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartRef.current || !containerRef.current) return;

        if (e.touches.length === 2 && touchStartRef.current.pinchDist) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDist = Math.hypot(dx, dy);
            
            // If distance changed by more than 40px
            if (newDist - touchStartRef.current.pinchDist > 40) {
                if (!isZoomed) setIsZoomed(true); // Pinch Out -> Zoom In
            } else if (touchStartRef.current.pinchDist - newDist > 40) {
                if (isZoomed) setIsZoomed(false); // Pinch In -> Zoom Out
            }
            return;
        }

        if (e.touches.length > 1) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const deltaY = touchStartRef.current.y - currentY;
        const deltaX = currentX - touchStartRef.current.x;

        const rect = containerRef.current.getBoundingClientRect();

        // Determine gesture direction from accumulated movement
        // Only trigger volume/brightness if primarily vertical swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) + 15) {
            // Horizontal swipe detected - skip volume/brightness
            return;
        }

        // Must have moved at least 5px vertically to trigger gesture
        if (Math.abs(deltaY) < 5) return;

        // 150 pixels swipe = 100% change (smoother feel)
        const percentChange = deltaY / 150;

        // Left side: Brightness
        if (touchStartRef.current.x < rect.width / 2) {
            setBrightness(prev => {
                const newBrightness = Math.max(0.2, Math.min(1.5, prev + percentChange));
                setGestureFeedback({ type: 'brightness', value: newBrightness });
                return newBrightness;
            });
        }
        // Right side: Volume
        else {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            if (isIOS) {
                // iOS does not allow volume control via JS
                setGestureFeedback({ type: 'error', value: 0 });
            } else if (videoRef.current) {
                const newVolume = Math.max(0, Math.min(1, videoRef.current.volume + percentChange));
                videoRef.current.volume = newVolume;
                setVolume(newVolume);
                setIsMuted(newVolume === 0);
                setGestureFeedback({ type: 'volume', value: newVolume });
            }
        }

        // Update the reference point for incremental tracking
        touchStartRef.current.y = currentY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const now = Date.now();
        const touch = e.changedTouches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        const container = containerRef.current;

        // Check if this was a quick tap (not a long press or swipe)
        const touchDuration = now - touchStartTimeRef.current;
        const wasTap = touchDuration < 250;

        // Check if touch moved significantly (swipe vs tap)
        const touchMoved = touchStartRef.current && (
            Math.abs(x - touchStartRef.current.x) > 20 ||
            Math.abs(y - touchStartRef.current.y) > 20
        );

        // Determine if it's a tap on the video/empty area, not a specific tool
        const target = e.target as HTMLElement;
        const isVideoTap = !target.closest('button') && !target.closest('input') && !target.closest('a');

        // Show controls on swipe end
        if (touchMoved && !showControls) setShowControls(true);

        if (container && wasTap && !touchMoved && isVideoTap) {
            e.preventDefault(); // Stop onClick from firing

            const rect = container.getBoundingClientRect();
            const side = x < rect.width / 2 ? 'left' : 'right';

            // Double tap detection (within 300ms and same side)
            if (lastTapRef.current &&
                now - lastTapRef.current.time < 300 &&
                lastTapRef.current.side === side) {

                // Clear single tap timer
                if (singleTapTimerRef.current) {
                    clearTimeout(singleTapTimerRef.current);
                    singleTapTimerRef.current = null;
                }

                // Double tap detected - seek video
                if (side === 'left') {
                    seekVideo(-10);
                } else {
                    seekVideo(10);
                }

                lastTapRef.current = null; // Reset to prevent triple tap
                ignoreNextClickRef.current = true;
            } else {
                // First tap - record time and position
                lastTapRef.current = { time: now, x, side };

                // Set a timer for single tap action
                if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
                singleTapTimerRef.current = setTimeout(() => {
                    let handled = false;
                    if (showEpisodePanel) {
                        setShowEpisodePanel(false);
                        handled = true;
                    }
                    if (showSettings) {
                        setShowSettings(false);
                        handled = true;
                    }
                    
                    if (!handled) {
                        if (!showControls && isPlaying) {
                            setShowControls(true);
                        } else {
                            togglePlay(e);
                        }
                    }
                    singleTapTimerRef.current = null;
                }, 300);
            }
        }

        touchStartRef.current = null;
        setTimeout(() => setGestureFeedback(null), 1000);
    };

    const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);

    const toggleFullscreen = async (e?: React.MouseEvent | React.TouchEvent) => {
        if (e) e.stopPropagation();
        try {
            const container = containerRef.current;
            const video = videoRef.current;

            if (!container || !video) return;

            // Check if standard fullscreen calls are available on container
            const requestFS = container.requestFullscreen ||
                (container as any).webkitRequestFullscreen ||
                (container as any).webkitRequestFullScreen ||
                (container as any).mozRequestFullScreen ||
                (container as any).msRequestFullscreen;

            const exitFS = document.exitFullscreen ||
                (document as any).webkitExitFullscreen ||
                (document as any).webkitCancelFullScreen ||
                (document as any).mozCancelFullScreen ||
                (document as any).msExitFullscreen;

            // Detection
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
            const hasNativeFallback = !!(video as any).webkitEnterFullscreen;

            // Current state check (more robust)
            const activeFullscreenElement = document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement ||
                (video as any).webkitDisplayingFullscreen;

            if (!activeFullscreenElement) {
                // ENTER FULLSCREEN
                // Priority: Use standard API if available, UNLESS on iOS Safari (non-standalone) where it's buggy
                if (requestFS && (!isIOS || isStandalone || !hasNativeFallback)) {
                    try {
                        await requestFS.call(container);
                        setIsFullscreen(true);

                        // Orientation Lock (Android)
                        if (screen.orientation && (screen.orientation as any).lock) {
                            try { await (screen.orientation as any).lock('landscape'); } catch { }
                        }
                    } catch (err) {
                        console.warn('Standard Fullscreen failed:', err);
                        if (hasNativeFallback) {
                            (video as any).webkitEnterFullscreen();
                            setIsFullscreen(true);
                        }
                    }
                } else if (hasNativeFallback) {
                    (video as any).webkitEnterFullscreen();
                    setIsFullscreen(true);
                }
            } else {
                // EXIT FULLSCREEN
                if (exitFS) {
                    await exitFS.call(document);
                } else if ((video as any).webkitExitFullscreen) {
                    (video as any).webkitExitFullscreen();
                } else if ((video as any).webkitExitFullscreen) {
                    (video as any).webkitExitFullscreen();
                }
                setIsFullscreen(false);

                if (screen.orientation && (screen.orientation as any).unlock) {
                    try { (screen.orientation as any).unlock(); } catch { }
                }
            }

        } catch (e) {
            console.error('Fullscreen error:', e);
        }
    };

    // -- PIP Logic --
    const togglePIP = async (e?: React.MouseEvent | React.TouchEvent) => {
        if (e) e.stopPropagation();
        try {
            const video = videoRef.current;
            if (!video) return;

            // Modern API (Android / Chrome / Desktop)
            if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            }
            // iOS WebKit Fallback (Safari / PWA)
            else if ((video as WebKitVideoElement).webkitSupportsPresentationMode && (video as WebKitVideoElement).webkitSupportsPresentationMode!('picture-in-picture')) {
                const webkitVideo = video as WebKitVideoElement;
                const mode = webkitVideo.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture';
                webkitVideo.webkitSetPresentationMode!(mode);
            }
            else {
                console.warn('PIP not supported on this browser/device');
            }
        } catch (e) {
            console.error('PIP error:', e);
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

    // Call onError safely after render (not during render) to avoid infinite re-render loops
    useEffect(() => {
        if (error && onError && !onErrorFiredRef.current) {
            onErrorFiredRef.current = true;
            onError();
        }
    }, [error, onError]);

    // Track view for anonymous users
    useEffect(() => {
        if (!user && movieSlug && episodeSlug) {
            // Wait a bit to ensure it's a real view (e.g. 5s)
            const timer = setTimeout(() => {
                fetch('/api/progress/track-view', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ movieSlug, episodeSlug })
                }).catch(err => console.error('Track view error', err));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [user, movieSlug, episodeSlug]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Set WebKit-specific attributes for iOS compatibility
        // These ensure video plays inline instead of fullscreen on iOS
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay', 'allow');
        video.setAttribute('playsinline', 'true');

        // Prevent iOS from automatically entering fullscreen
        video.setAttribute('preload', 'metadata');

        // Disable Picture-in-Picture on iOS (can interfere with inline playback)
        video.disablePictureInPicture = false;

        if (!src) {
            setError(true);
            setIsLoading(false);
            return;
        }

        setError(false);
        onErrorFiredRef.current = false;
        setIsLoading(true);
        let hls: Hls;
        let networkRetryCount = 0;

        const onVideoLoaded = () => setIsLoading(false);
        const onVideoWaiting = () => setIsLoading(true);
        const onVideoPlaying = () => {
            setIsLoading(false);
            setIsPlaying(true);
        };
        const onVideoPause = () => setIsPlaying(false);
        const onVideoEnded = () => {
            // Trigger onEnded callback if exists
            if (onEnded && !cancelledAutoPlay) {
                onEnded();
            }
        };
        const onLoadedMetadata = () => {
            // Logic to restore time or start fresh
            const isSameEpisode = prevEpisodeRef.current?.movie === movieSlug &&
                prevEpisodeRef.current?.episode === episodeSlug;

            // Priority:
            // 1. If switching source within same episode -> restore savedTimeRef
            // 2. startTime from URL param
            // 3. saved progress (initialProgress)

            if (isSameEpisode && savedTimeRef.current > 0) {
                // Restore time when switching source (Vietsub <-> Thuyết minh)
                video.currentTime = savedTimeRef.current;
            } else {
                // New episode or first load
                savedTimeRef.current = 0; // Reset saved time for safety
                if (startTime > 0) {
                    video.currentTime = startTime;
                } else if (initialProgress !== null && initialProgress > 10) {
                    video.currentTime = initialProgress;
                } else {
                    // Force reset to 0 in case the `<video>` element retained its currentTime
                    video.currentTime = 0;
                }
            }

            // Update ref for next time
            prevEpisodeRef.current = { movie: movieSlug || '', episode: episodeSlug || '' };
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
        video.addEventListener('ended', onVideoEnded);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);

        // Listen for fullscreen changes to update state correctly
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange); // iOS/Safari
        video.addEventListener('webkitbeginfullscreen', () => setIsFullscreen(true));
        video.addEventListener('webkitendfullscreen', () => setIsFullscreen(false)); // iOS native exit

        if (Hls.isSupported()) {
            hls = new Hls({
                capLevelToPlayerSize: true,
                autoStartLoad: true,
                enableWorker: true,
                // === Performance & Seeking ===
                progressive: true, // Crucial: start playing before fragment is fully loaded
                // === Memory Management (critical for long sessions / PWA) ===
                maxBufferLength: 60,           // Tăng từ 45→60s: ít bị stall hơn khi CDN chậm
                backBufferLength: 30,          // 30s: đủ để tua lại mà không nặng RAM mobile
                maxMaxBufferLength: 120,       // Tăng từ 90→120s: cho phép buffer tối đa 2 phút
                maxBufferSize: 50 * 1024 * 1024, // 50MB: cân bằng giữa HD quality và RAM mobile
                fragLoadingTimeOut: 20000,     // Tăng từ 15→20s: CDN chậm có thêm thời gian
                fragLoadingMaxRetry: 6,        // Tăng từ 5→6 lần retry khi segment lỗi
                fragLoadingRetryDelay: 1000,   // Thêm: chờ 1s giữa các lần retry
                appendErrorMaxRetry: 5,        // Tăng từ 3→5
                levelLoadingTimeOut: 20000,    // Thêm: timeout cho manifest/level
                manifestLoadingTimeOut: 20000, // Thêm: timeout cho manifest load
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
                    video.play().catch((e) => {
                        if (e.name === 'NotAllowedError') {
                            setIsMuted(true);
                            video.muted = true;
                            video.play().catch(err => {
                                if (err.name !== 'AbortError') console.error('Muted play error:', err);
                            });
                        } else if (e.name !== 'AbortError') {
                            console.error('AutoPlay error:', e);
                        }
                    });
                }
            });

            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            // Manifest load failure = CDN is dead, no point retrying
                            if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                                data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                                hls.destroy();
                                setError(true);
                            } else {
                                // Segment-level error: try to resume with exponential backoff
                                networkRetryCount++;
                                if (networkRetryCount <= 3) {
                                    const delay = [1000, 3000, 5000][networkRetryCount - 1] || 1000;
                                    setTimeout(() => { if (hls) hls.startLoad(); }, delay);
                                    console.warn(`[HLS] Network drop 4G, auto-retry ${networkRetryCount} in ${delay}ms`);
                                } else {
                                    hls.destroy();
                                    setError(true);
                                }
                            }
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

            // Reset retry count upon successful network transfer
            hls.on(Hls.Events.FRAG_LOADED, () => {
                networkRetryCount = 0;
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            if (autoPlay) {
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch((e) => {
                        if (e.name === 'NotAllowedError') {
                            setIsMuted(true);
                            video.muted = true;
                            video.play().catch(err => {
                                if (err.name !== 'AbortError') console.error('Muted play error:', err);
                            });
                        } else if (e.name !== 'AbortError') {
                            console.error('AutoPlay Safari error:', e);
                        }
                    });
                });
            }
        }

        // Visibility Change Handler to recover video when returning to suspended tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && hls && video) {
                // If returning to tab and video is stalled/buffering, recover
                if (!video.paused && video.readyState < 3) {
                    console.warn('[HLS] Đánh thức Tab bị ẩn, ép tải lại luồng phim...');
                    hls.recoverMediaError();
                    hls.startLoad();
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (hls) hls.destroy();
            video.removeEventListener('loadeddata', onVideoLoaded);
            video.removeEventListener('waiting', onVideoWaiting);
            video.removeEventListener('playing', onVideoPlaying);
            video.removeEventListener('pause', onVideoPause);
            video.removeEventListener('ended', onVideoEnded);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            // Cleanup fullscreen listeners
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            video.removeEventListener('webkitendfullscreen', () => setIsFullscreen(false));
            video.removeEventListener('webkitpresentationmodechanged', () => {
                // handle iOS pip state change if needed
            });
        };
    }, [src, autoPlay]);

    // Countdown timer for next episode
    useEffect(() => {
        if (!showNextEpisode || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showNextEpisode, countdown]);

    // Reset next episode states when src changes
    useEffect(() => {
        setShowNextEpisode(false);
        setCountdown(10);
        setCancelledAutoPlay(false);
    }, [src]);

    // Keyboard controls for seeking
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            // Only handle if video player is focused or visible
            if (!videoRef.current) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    seekVideo(-10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    seekVideo(10);
                    break;
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case '[':
                    if (onPrevEpisode) {
                        e.preventDefault();
                        onPrevEpisode();
                    }
                    break;
                case ']':
                    if (onNextEpisode) {
                        e.preventDefault();
                        onNextEpisode();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onPrevEpisode, onNextEpisode]);

    // Native touch handler with passive:false to allow preventDefault (stop page scroll during gesture)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Track if swipe is vertical for scroll prevention
        let startX = 0;
        let startY = 0;
        let isVerticalSwipe: boolean | null = null;

        const onTouchStart = (e: TouchEvent) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isVerticalSwipe = null;
        };

        const onTouchMove = (e: TouchEvent) => {
            const deltaX = Math.abs(e.touches[0].clientX - startX);
            const deltaY = Math.abs(e.touches[0].clientY - startY);

            // Determine direction on first move
            if (isVerticalSwipe === null && (deltaX > 5 || deltaY > 5)) {
                isVerticalSwipe = deltaY > deltaX;
            }

            // Only prevent default for vertical swipes to stop page scroll
            if (isVerticalSwipe) {
                e.preventDefault();
            }
        };

        container.addEventListener('touchstart', onTouchStart, { passive: true });
        container.addEventListener('touchmove', onTouchMove, { passive: false });

        return () => {
            container.removeEventListener('touchstart', onTouchStart);
            container.removeEventListener('touchmove', onTouchMove);
        };
    }, []);



    return (
        <div
            ref={containerRef}
            className={`relative bg-black border border-border shadow-2xl shadow-primary/10 group select-none overflow-visible transition-all duration-300
                ${isLandscape
                    ? 'fixed inset-0 z-9999 w-[100vh] h-[100vw] rotate-90 origin-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-none'
                    : 'w-full h-full rounded-lg'
                }`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
            onClick={handleContainerClick}
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
                className={`w-full h-full ${isZoomed ? 'object-cover' : 'object-contain'} rounded-lg`}
                playsInline
                autoPlay={autoPlay}
            />

            {/* Error Overlay */}
            {error && (
                <div className="absolute inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center rounded-lg gap-4 border border-border">
                    <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                    <p className="text-red-500 font-medium">Lỗi luồng phát. Đang tìm nguồn dự phòng...</p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="mt-2 text-white border-white/20 hover:bg-white/10">Tải lại trang</Button>
                </div>
            )}

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
                            <span className="text-xs text-center text-gray-300">iPhone/iPad không hỗ trợ<br />chỉnh âm lượng cảm ứng</span>
                        )}
                    </div>
                </div>
            )}

            {/* Seek Feedback Overlay */}
            {seekFeedback && (
                <div className={`absolute inset-0 flex items-center z-40 pointer-events-none ${isLandscape ? '-rotate-90' : ''} ${seekFeedback.direction === 'forward' ? 'justify-end pr-8' : 'justify-start pl-8'
                    }`}>
                    <div className="bg-black/20 backdrop-blur-xl p-4 rounded-2xl text-white/80 flex flex-col items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                        {seekFeedback.direction === 'forward' ? (
                            <FastForward className="w-10 h-10 text-primary opacity-80" />
                        ) : (
                            <Rewind className="w-10 h-10 text-primary opacity-80" />
                        )}
                        <span className="text-xl font-bold">
                            {seekFeedback.direction === 'forward' ? '+' : '-'}{seekFeedback.amount}s
                        </span>
                    </div>
                </div>
            )}

            {/* Next Episode Countdown Overlay */}
            {showNextEpisode && nextEpisodeInfo && !cancelledAutoPlay && (
                <div className={`absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm pointer-events-auto ${isLandscape ? '-rotate-90' : ''}`}
                    onClick={(e) => e.stopPropagation()}>
                    <div className="bg-linear-to-br from-gray-900 to-black border border-primary/30 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
                        <div className="text-center space-y-4">
                            <div className="text-primary text-4xl font-bold">{countdown}</div>
                            <div className="space-y-2">
                                <p className="text-gray-300 text-sm">Tập tiếp theo sẽ phát tự động</p>
                                <p className="text-white font-semibold text-lg">{nextEpisodeInfo.name}</p>
                            </div>
                            <Button
                                onClick={() => {
                                    setCancelledAutoPlay(true);
                                    setShowNextEpisode(false);
                                }}
                                variant="outline"
                                className="w-full border-white/20 hover:border-primary hover:bg-primary/10"
                            >
                                Hủy tự động phát
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* In-Player Episode Panel - only visible on landscape/wide screens */}
            {episodeServers && episodeServers.length > 0 && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none hidden landscape:block md:block z-50">
                    <div
                        className={`absolute inset-y-0 right-0 w-72 bg-black/90 backdrop-blur-md flex flex-col pointer-events-auto transition-transform duration-300 ease-in-out will-change-transform ${showEpisodePanel ? 'translate-x-0' : 'translate-x-full'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Panel Header */}
                        <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
                            <span className="text-white font-bold text-sm flex items-center gap-2">
                                <ListVideo className="w-4 h-4 text-primary" /> Danh sách tập
                            </span>
                            <button
                                onClick={() => setShowEpisodePanel(false)}
                                className="text-gray-400 hover:text-white text-lg leading-none px-1"
                            >
                                ×
                            </button>
                        </div>

                        {/* Category Tabs */}
                        {episodeServers.length > 1 && (
                            <div className="flex gap-1 p-2 border-b border-white/10 overflow-x-auto custom-scrollbar shrink-0">
                                {episodeServers.map(s => (
                                    <button
                                        key={s.server_name}
                                        onClick={() => setPanelServerName(s.server_name)}
                                        className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-all ${(panelServerName ?? episodeServers[0].server_name) === s.server_name ? 'bg-primary text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                                    >
                                        {s.cleanName}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Episode Grid */}
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            <div className="grid grid-cols-4 gap-1.5">
                                {(episodeServers.find(s => s.server_name === (panelServerName ?? episodeServers[0].server_name)) ?? episodeServers[0]).episodes.map(ep => {
                                    const isActive = ep.slug === episodeSlug;
                                    return (
                                        <button
                                            key={ep.slug}
                                            onClick={() => {
                                                onEpisodeSelect?.(panelServerName ?? episodeServers[0].server_name, ep.slug);
                                                setShowEpisodePanel(false);
                                            }}
                                            className={`px-1 py-2 text-[10px] font-medium rounded transition-all border relative flex items-center justify-center ${isActive ? 'bg-primary text-black border-primary font-bold' : 'bg-white/10 text-gray-300 border-transparent hover:bg-white/20'}`}
                                        >
                                            {ep.name}
                                            {isActive && (
                                                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-black/30 rounded-full animate-pulse" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Spinner */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 pointer-events-none">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            )
            }

            {/* Skip Intro Button */}
            {
                showSkipIntro && intro && (
                    <div className="absolute bottom-24 right-4 z-30 animate-in fade-in slide-in-from-bottom-4">
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (videoRef.current && intro) {
                                    videoRef.current.currentTime = intro[1];
                                    setCurrentTime(intro[1]);
                                    setShowSkipIntro(false);
                                }
                            }}
                            className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 gap-2 pl-3 pr-4 h-10 rounded-full font-medium shadow-lg transition-all"
                        >
                            <SkipForward className="w-4 h-4 fill-current" />
                            Bỏ qua giới thiệu
                        </Button>
                    </div>
                )
            }

            {/* Controls Overlay */}
            <div className={`absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end px-3 py-3 md:p-4 transition-opacity duration-300 z-10 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                {/* Progress Bar */}
                <div
                    className="w-full mb-4 flex items-center gap-2 group/progress relative"
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
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
                        value={isScrubbing ? scrubTime : currentTime}
                        onChange={handleScrubbing}
                        onPointerUp={handleScrubEnd}
                        onMouseUp={handleScrubEnd}
                        onTouchEnd={handleScrubEnd}
                        className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary transition-all group-hover/progress:h-2"
                        style={{
                            background: `linear-gradient(to right, #D4AF37 ${((isScrubbing ? scrubTime : currentTime) / duration) * 100}%, rgba(255,255,255,0.2) ${((isScrubbing ? scrubTime : currentTime) / duration) * 100}%)`
                        }}
                    />
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-between gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5 sm:gap-2 md:gap-4">
                        <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:text-primary hover:bg-transparent">
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }} className="hidden md:flex text-white/70 hover:text-white hover:bg-transparent">
                            <Rewind className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }} className="hidden md:flex text-white/70 hover:text-white hover:bg-transparent">
                            <FastForward className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-1 border-l border-white/10 ml-1 sm:ml-2 pl-1 sm:pl-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); onPrevEpisode?.(); }}
                                disabled={!onPrevEpisode || !prevEpisodeInfo}
                                className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 disabled:opacity-30 disabled:hover:bg-transparent"
                                title={prevEpisodeInfo ? `Tập trước: ${prevEpisodeInfo.name}` : ''}
                            >
                                <SkipBack className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); onNextEpisode?.(); }}
                                disabled={!onNextEpisode || !nextEpisodeInfo}
                                className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 disabled:opacity-30 disabled:hover:bg-transparent"
                                title={nextEpisodeInfo ? `Tập tiếp theo: ${nextEpisodeInfo.name}` : ''}
                            >
                                <SkipForward className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-1 group/volume">
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

                        <span className="text-white text-[9px] sm:text-xs font-mono whitespace-nowrap">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-3">
                        {/* Settings Button logic */}
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                                className={`text-white hover:text-primary hover:bg-transparent ${showSettings ? 'rotate-90 text-primary' : ''} transition-all`}
                            >
                                <Settings className="w-5 h-5" />
                            </Button>


                            {/* Settings Popup */}
                            {showSettings && (
                                <div className={`absolute bottom-12 right-0 bg-black/95 border border-white/20 rounded-lg p-2.5 min-w-45 max-h-[70vh] overflow-y-auto text-white space-y-3 z-60 shadow-2xl custom-scrollbar ${isLandscape ? '-rotate-90 origin-bottom-right translate-x-full' : ''}`}>
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
                                                        {level.height}p
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Episode List Button - hidden on portrait mobile */}
                        {episodeServers && episodeServers.length > 0 && (
                            <div className="hidden landscape:block md:block">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!panelServerName && episodeServers.length > 0) {
                                            setPanelServerName(episodeServers[0].server_name);
                                        }
                                        setShowEpisodePanel(v => !v);
                                        setShowSettings(false);
                                    }}
                                    className={`text-white hover:text-primary hover:bg-transparent ${showEpisodePanel ? 'text-primary' : ''}`}
                                    title="Danh sách tập"
                                >
                                    <ListVideo className="w-5 h-5" />
                                </Button>
                            </div>
                        )}

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



                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => togglePIP(e)}
                            className="text-white hover:text-primary hover:bg-transparent flex"
                            title="Picture-in-Picture"
                        >
                            <PictureInPicture className="w-5 h-5" />
                        </Button>

                        <Button variant="ghost" size="icon" onClick={(e) => toggleFullscreen(e)} className="text-white hover:text-primary hover:bg-transparent flex items-center justify-center">
                            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div >
    );
}
