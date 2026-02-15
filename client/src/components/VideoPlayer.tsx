'use client';
import { useEffect, useRef, useState, useMemo, memo } from 'react';
import Artplayer from 'artplayer';
import artplayerPluginHlsControl from 'artplayer-plugin-hls-control';
import Hls from 'hls.js';
import { useAuth } from '@/contexts/auth-context';
import { useWatchProgress } from '@/hooks/useWatchProgress';

interface VideoPlayerProps {
    src: string;
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

const VideoPlayer = ({
    src,
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
}: VideoPlayerProps) => {
    const { user } = useAuth();
    const artRef = useRef<Artplayer | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [brightness, setBrightness] = useState(1);
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);

    // Watch Progress Hook
    const { initialProgress, debouncedSave } = useWatchProgress({
        movieSlug,
        movieName,
        movieThumb,
        episodeSlug,
        episodeName,
        serverName
    });

    useEffect(() => {
        if (!containerRef.current) return;

        let hlsInstance: Hls | null = null;
        let isDestroyed = false;

        const art = new Artplayer({
            container: containerRef.current,
            url: src,
            poster: poster,
            volume: 1,
            isLive: false,
            muted: false,
            autoplay: false,
            pip: false, // Disabled for stability
            autoSize: false,
            autoMini: false, // Disabled to prevent background play hidden issues
            screenshot: false,
            setting: true,
            loop: false,
            flip: true,
            playbackRate: true,
            aspectRatio: true,
            fullscreen: true,
            fullscreenWeb: false,
            subtitleOffset: true,
            miniProgressBar: true,
            mutex: true,
            backdrop: true,
            playsInline: true,
            autoPlayback: true,
            airplay: true,
            theme: '#eab308',
            lang: 'vi',
            moreVideoAttr: {
                crossOrigin: 'anonymous',
                playsInline: true,
            },
            controls: [
                {
                    name: 'subtitle-selector',
                    position: 'right',
                    index: 11,
                    html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 12H4v-2h8v2zm8 0h-6v-2h6v2zm0-4H4V8h16v4z"/></svg>',
                    selector: (subtitles && subtitles.length > 0) ? subtitles.map((sub, index) => ({
                        default: sub.default,
                        html: sub.label,
                        url: sub.url,
                        index
                    })) : [{ html: 'Không có phụ đề', index: 0 }],
                    onSelect: function (item: any) {
                        if (item.url) {
                            // @ts-ignore
                            this.subtitle.url = item.url;
                            // @ts-ignore
                            this.subtitle.show = true;
                        }
                        // @ts-ignore
                        const control = this.controls['subtitle-selector'];
                        if (control) control.classList.remove('menu-active');
                        return ''; // Return empty string to prevent text from showing in bar
                    },
                    click: function () {
                        // @ts-ignore
                        const control = this.controls['subtitle-selector'];
                        if (control) {
                            const isActive = control.classList.contains('menu-active');
                            // Close other menus
                            // @ts-ignore
                            const audioControl = this.controls['audio-selector'];
                            if (audioControl) audioControl.classList.remove('menu-active');
                            // @ts-ignore
                            const qualityControl = this.controls['quality'];
                            if (qualityControl) qualityControl.classList.remove('menu-active');

                            if (isActive) {
                                control.classList.remove('menu-active');
                            } else {
                                control.classList.add('menu-active');
                            }
                        }
                    }
                },
                {
                    name: 'audio-selector',
                    position: 'right',
                    index: 12,
                    html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
                    selector: [{ default: true, html: 'Mặc định', index: 0 }],
                    onSelect: function (item: any) {
                        // @ts-ignore
                        if (this.hls && this.hls.audioTracks && this.hls.audioTracks[item.index]) {
                            // @ts-ignore
                            this.hls.audioTrack = item.index;
                        }
                        // @ts-ignore
                        const control = this.controls['audio-selector'];
                        if (control) control.classList.remove('menu-active');
                        return ''; // Return empty string to prevent text from showing in bar
                    },
                    click: function () {
                        // @ts-ignore
                        const control = this.controls['audio-selector'];
                        if (control) {
                            const isActive = control.classList.contains('menu-active');
                            // Close other menus
                            // @ts-ignore
                            const subControl = this.controls['subtitle-selector'];
                            if (subControl) subControl.classList.remove('menu-active');
                            // @ts-ignore
                            const qualityControl = this.controls['quality'];
                            if (qualityControl) qualityControl.classList.remove('menu-active');

                            if (isActive) {
                                control.classList.remove('menu-active');
                            } else {
                                control.classList.add('menu-active');
                            }
                        }
                    }
                }
            ],
            subtitle: {
                url: subtitles.find(s => s.default)?.url || '',
                type: 'srt',
                style: {
                    color: '#fff',
                    fontSize: '24px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)',
                    fontWeight: '500',
                },
                encoding: 'utf-8',
            },
            customType: {
                m3u8: function (video, url) {
                    if (isDestroyed) return;

                    if (Hls.isSupported()) {
                        const hls = new Hls({
                            maxBufferLength: 30,
                            maxMaxBufferLength: 60,
                        });
                        hlsInstance = hls;
                        // @ts-ignore
                        art.hls = hls;
                        hls.loadSource(url);
                        hls.attachMedia(video);

                        // Handle HLS errors
                        hls.on(Hls.Events.ERROR, (event, data) => {
                            if (data.fatal) {
                                switch (data.type) {
                                    case Hls.ErrorTypes.NETWORK_ERROR:
                                        art.notice.show = 'Lỗi kết nối server. Vui lòng thử đổi server khác.';
                                        hls.startLoad();
                                        break;
                                    case Hls.ErrorTypes.MEDIA_ERROR:
                                        art.notice.show = 'Lỗi tệp tin media. Đang thử khôi phục...';
                                        hls.recoverMediaError();
                                        break;
                                    default:
                                        art.notice.show = 'Lỗi không xác định. Vui lòng tải lại trang.';
                                        hls.destroy();
                                        break;
                                }
                            }
                        });

                        // Detect Audio Tracks from HLS
                        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                            if (isDestroyed) return;
                            const hlsAudioTracks = hls.audioTracks;
                            if (hlsAudioTracks && hlsAudioTracks.length > 0) {
                                const audioSelector = hlsAudioTracks.map((track, index) => ({
                                    default: track.id === hls.audioTrack,
                                    html: track.name || track.lang || `Âm thanh ${index + 1}`,
                                    index: index,
                                }));

                                // Update the existing audio control selector instead of adding a new one
                                art.controls.update({
                                    name: 'audio-selector',
                                    selector: audioSelector,
                                });
                            }
                        });

                        // Sync subtitle if default 
                        const defaultSub = subtitles.find(s => s.default);
                        if (defaultSub) {
                            art.subtitle.url = defaultSub.url;
                            art.subtitle.show = true;
                        }
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = url;
                    } else {
                        art.notice.show = 'Unsupported media type: m3u8';
                    }
                },
            },
            plugins: [
                artplayerPluginHlsControl({
                    quality: {
                        control: true,
                        setting: false,
                        title: 'Chất lượng',
                        auto: 'Tự động',
                    },
                }),
            ],
        });

        artRef.current = art;

        // Custom Episode Controls
        if (onPrevEpisode) {
            art.controls.add({
                name: 'prev-episode',
                position: 'left',
                index: 10,
                html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" class="hover:text-primary transition-colors"><path d="M11 18l-6-6 6-6v12zM19 18l-6-6 6-6v12z"/></svg>',
                tooltip: 'Tập trước',
                click: function () {
                    onPrevEpisode();
                },
            });
        }

        if (onNextEpisode) {
            art.controls.add({
                name: 'next-episode',
                position: 'left',
                index: 11,
                html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" class="hover:text-primary transition-colors"><path d="M13 6l6 6-6 6V6zM5 6l6 6-6 6V6z"/></svg>',
                tooltip: 'Tập tiếp theo',
                click: function () {
                    onNextEpisode();
                },
            });
        }

        // Handle Events
        art.on('video:timeupdate', () => {
            const currentTime = art.video.currentTime;
            const duration = art.video.duration;
            if (onTimeUpdate) onTimeUpdate(currentTime);
            if (user && movieSlug && episodeSlug) {
                debouncedSave(currentTime, duration);
            }
        });

        art.on('video:ended', () => {
            if (onEnded) onEnded();
        });

        // Toggle Quality menu on click (for Consistency)
        // Global click-away to close menus
        const handleGlobalClick = () => {
            const controls = ['subtitle-selector', 'audio-selector', 'quality'];
            controls.forEach(name => {
                const control = art.controls[name];
                if (control) control.classList.remove('menu-active');
            });
        };
        window.addEventListener('click', handleGlobalClick);

        art.on('ready', () => {
            console.log('[VideoPlayer] Ready. Subtitles received:', subtitles?.length);

            // Restore progress from props if available
            if (startTime > 0) {
                art.currentTime = startTime;
            }

            // Handle autoplay safely
            if (autoPlay) {
                art.play().catch(err => {
                    if (err.name === 'NotAllowedError') {
                        art.muted = true;
                        art.play().catch(e => console.error('Silent play failed:', e));
                        art.notice.show = 'Tự động phát (tắt tiếng)';
                    } else if (err.name !== 'AbortError') {
                        console.error('Playback error:', err);
                    }
                });
            }

            // Quality control click handler
            const qualityControl = art.controls['quality'];
            if (qualityControl) {
                qualityControl.addEventListener('click', (e: MouseEvent) => {
                    e.stopPropagation();
                    const subControl = art.controls['subtitle-selector'];
                    const audioControl = art.controls['audio-selector'];
                    if (subControl) subControl.classList.remove('menu-active');
                    if (audioControl) audioControl.classList.remove('menu-active');

                    qualityControl.classList.toggle('menu-active');
                });
            }
        });

        // -- Mobile Gestures --
        const handleTouchStart = (e: TouchEvent) => {
            const isLandscape = window.innerWidth > window.innerHeight;
            if (!isLandscape) return;

            touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!touchStartRef.current || !artRef.current) return;

            const isLandscape = window.innerWidth > window.innerHeight;
            if (!isLandscape) return;

            // Prevent scrolling while gesturing
            if (e.cancelable) e.preventDefault();

            const deltaY = touchStartRef.current.y - e.touches[0].clientY;
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const sensitivity = 150; // Pixels for 100% change
            const percentChange = deltaY / sensitivity;

            // Left side: Brightness
            if (touchStartRef.current.x < rect.left + rect.width / 2) {
                setBrightness((prev: number) => {
                    const next = Math.max(0.2, Math.min(1, prev + percentChange * 0.1));
                    art.notice.show = `Độ sáng: ${Math.round(next * 100)}%`;
                    return next;
                });
            }
            // Right side: Volume
            else {
                const currentVolume = art.volume;
                const nextVolume = Math.max(0, Math.min(1, currentVolume + percentChange * 0.1));
                art.volume = nextVolume;
                art.notice.show = `Âm lượng: ${Math.round(nextVolume * 100)}%`;
            }

            // Update start position for smooth continuous gesture
            touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        };

        const handleTouchEnd = () => {
            touchStartRef.current = null;
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('touchstart', handleTouchStart);
            container.addEventListener('touchmove', handleTouchMove, { passive: false });
            container.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            isDestroyed = true;
            window.removeEventListener('click', handleGlobalClick);
            if (container) {
                container.removeEventListener('touchstart', handleTouchStart);
                container.removeEventListener('touchmove', handleTouchMove);
                container.removeEventListener('touchend', handleTouchEnd);
            }
            if (hlsInstance) {
                hlsInstance.stopLoad();
                hlsInstance.detachMedia();
                hlsInstance.destroy();
                hlsInstance = null;
            }
            if (artRef.current) {
                artRef.current.destroy(true);
                artRef.current = null;
            }
        };
    }, [src, user, movieSlug, episodeSlug, subtitles]);

    return (
        <div className="relative w-full h-full bg-[#050505] rounded-xl overflow-hidden border border-white/10 group shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <div ref={containerRef} className="w-full h-full" />

            {/* Brightness Overlay */}
            <div
                className="absolute inset-0 pointer-events-none z-[5] bg-black transition-opacity duration-100"
                style={{ opacity: 1 - brightness }}
            />
            <style jsx global>{`
                .artplayer-app {
                    border-radius: 12px;
                    font-family: 'Inter', sans-serif;
                }
                
                /* Control Bar Glassmorphism */
                .art-bottom {
                    background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0) 100%) !important;
                    padding-bottom: 0 !important;
                }
                
                .art-controls {
                    background: rgba(10, 10, 10, 0.4) !important;
                    backdrop-filter: blur(12px) !important;
                    border-radius: 12px !important;
                    margin: 0 12px 4px 12px !important;
                    border: 1px solid rgba(234, 179, 8, 0.1) !important;
                    height: 48px !important;
                }

                /* Progress Bar Styling */
                .art-progress-loaded {
                    background: rgba(255, 255, 255, 0.1) !important;
                }
                
                .art-progress-played {
                    background: linear-gradient(90deg, #ca8a04 0%, #eab308 100%) !important;
                    box-shadow: 0 0 15px rgba(234, 179, 8, 0.3);
                }
                
                .art-progress-indicator {
                    background: #fff !important;
                    width: 14px !important;
                    height: 14px !important;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }

                /* Icons & Controls */
                .art-control {
                    color: #d1d5db !important;
                    transition: all 0.2s ease !important;
                }
                
                .art-control:hover {
                    color: #eab308 !important;
                    transform: scale(1.1);
                }

                /* Settings Menu */
                .art-setting {
                    background: rgba(10, 10, 10, 0.9) !important;
                    backdrop-filter: blur(20px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 12px !important;
                    color: #fff !important;
                    padding: 8px !important;
                }
                
                .art-setting-item:hover {
                    background: rgba(234, 179, 8, 0.2) !important;
                    border-radius: 8px;
                }

                /* Notices - More subtle */
                .art-notice {
                    background: rgba(0, 0, 0, 0.7) !important;
                    border: 1px solid rgba(234, 179, 8, 0.3) !important;
                    color: #eab308 !important;
                    font-weight: 600 !important;
                    border-radius: 8px !important;
                    padding: 8px 16px !important;
                    font-size: 13px !important;
                    backdrop-filter: blur(8px);
                    top: 20px !important;
                    left: 20px !important;
                    transform: none !important;
                }

                /* Subtitle UI */
                .art-subtitle {
                    bottom: 12% !important;
                    padding: 0 20px !important;
                }
                
                .art-subtitle p {
                    background: rgba(0, 0, 0, 0.45) !important;
                    backdrop-filter: blur(4px);
                    padding: 4px 12px !important;
                    border-radius: 8px;
                }

                /* Volume bar */
                .art-volume-panel-handle {
                    background: #eab308 !important;
                }

                /* Custom controls spacing */
                .art-control-prev-episode, .art-control-next-episode {
                    margin: 0 4px !important;
                }
                
                /* Large Play Button in center */
                .art-state {
                    background: rgba(234, 179, 8, 0.1);
                    border: 2px solid rgba(234, 179, 8, 0.3);
                    border-radius: 50%;
                    width: 70px;
                    height: 70px;
                }
                
                .art-state svg {
                    width: 40px;
                    height: 40px;
                    fill: #eab308;
                }

                /* Custom Selector Styling */
                .art-control-subtitle-selector, 
                .art-control-audio-selector,
                .art-control-quality {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: auto !important;
                    min-width: 38px !important;
                    height: 100% !important;
                    cursor: pointer !important;
                    color: #d1d5db !important;
                    position: relative !important;
                }

                .art-control-subtitle-selector:hover, 
                .art-control-audio-selector:hover,
                .art-control-quality:hover {
                    color: #eab308 !important;
                }

                .art-control-subtitle-selector svg,
                .art-control-audio-selector svg {
                    width: 22px !important;
                    height: 22px !important;
                    fill: currentColor !important;
                    display: block !important;
                }

                /* Suppress default Artplayer hover-to-show menu */
                .art-control-subtitle-selector:hover .art-selector-list,
                .art-control-audio-selector:hover .art-selector-list,
                .art-control-quality:hover .art-selector-list {
                    display: none !important;
                }

                /* Show menu only when active (on click) */
                .art-control-subtitle-selector.menu-active .art-selector-list,
                .art-control-audio-selector.menu-active .art-selector-list,
                .art-control-quality.menu-active .art-selector-list {
                    display: block !important;
                }

                /* Ensure text hidden but svg visible */
                .art-control-subtitle-selector .art-selector-value,
                .art-control-audio-selector .art-selector-value {
                    font-size: 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                /* Dropdown list styling */
                .art-control-subtitle-selector .art-selector-list,
                .art-control-audio-selector .art-selector-list,
                .art-control-quality .art-selector-list {
                    background: rgba(15, 15, 15, 0.98) !important;
                    backdrop-filter: blur(20px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 8px !important;
                    min-width: 150px !important;
                    bottom: 52px !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important;
                    z-index: 9999 !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                }

                .art-selector-item {
                    padding: 10px 16px !important;
                    font-size: 13px !important;
                    color: #e5e7eb !important;
                }

                .art-selector-item:hover {
                    background: rgba(234, 179, 8, 0.2) !important;
                    color: #fff !important;
                }

                .art-selector-item-active {
                    color: #eab308 !important;
                }
            `}</style>
        </div>
    );
};

export default memo(VideoPlayer);
