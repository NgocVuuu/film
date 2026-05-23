'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { X, SkipForward, Volume2, VolumeX } from 'lucide-react';

// ── Config ───────────────────────────────────────────────────────────────────
const VAST_URL =
    process.env.NEXT_PUBLIC_AD_PREROLL_URL ||
    'https://difficultblock.com/d/mjF/z.dgGQN/vVZTG/UZ/feJmy9/uzZOUClIk_PMT/cfwmMtzzczy-NTjsETtoNtzLAozWNpzGIh2bNzQP';
const SKIP_AFTER_SEC = 7; // Đồng bộ với Hilltop skipoffset="00:00:07"
// ─────────────────────────────────────────────────────────────────────────────

interface VASTData {
    videoUrl: string;
    clickThrough: string;
    impressionUrl: string;
    startUrl: string;
}

interface PreRollAdProps {
    onDismiss: () => void;
    poster?: string;
}

/** Ping một URL bằng Image beacon (không bị CORS chặn) */
function ping(url: string) {
    if (!url) return;
    try { new Image().src = url; } catch { /* silent */ }
}

export function PreRollAd({ onDismiss, poster }: PreRollAdProps) {
    const { user, loading } = useAuth();
    const [ad, setAd] = useState<VASTData | null>(null);
    const [fetchDone, setFetchDone] = useState(false); // VAST fetch hoàn tất (kể cả lỗi)
    const [countdown, setCountdown] = useState(SKIP_AFTER_SEC);
    const [dismissed, setDismissed] = useState(false);
    const [muted, setMuted] = useState(true); // muted để autoplay hoạt động
    const videoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const tracked = useRef({ impression: false, start: false });

    const isPremium = user?.isPremium;

    // ── Dismiss helper ───────────────────────────────────────────────────────
    const dismiss = useCallback(() => {
        if (dismissed) return;
        setDismissed(true);
        if (timerRef.current) clearInterval(timerRef.current);
        onDismiss();
    }, [dismissed, onDismiss]);

    // Auto-dismiss premium users
    useEffect(() => {
        if (loading) return;
        if (isPremium) dismiss();
    }, [loading, isPremium, dismiss]);

    // ── Fetch & parse VAST XML ───────────────────────────────────────────────
    useEffect(() => {
        if (loading || isPremium || dismissed) return;

        const controller = new AbortController();

        // Dùng proxy để tránh CORS: /api/vast?url=...
        const proxyUrl = `/api/vast?url=${encodeURIComponent(VAST_URL)}`;

        fetch(proxyUrl, { signal: controller.signal })
            .then(r => {
                if (!r.ok) throw new Error('VAST fetch failed');
                return r.text();
            })
            .then(xml => {
                const doc = new DOMParser().parseFromString(xml, 'text/xml');
                const inlines = Array.from(doc.querySelectorAll('InLine'));

                let picked: VASTData | null = null;

                for (const inline of inlines) {
                    const mediaFiles = Array.from(inline.querySelectorAll('MediaFile'));
                    // Ưu tiên MP4, fallback WebM
                    const media =
                        mediaFiles.find(m => m.getAttribute('type')?.includes('mp4')) ||
                        mediaFiles.find(m => m.getAttribute('type')?.includes('webm'));

                    const videoUrl = media?.textContent?.trim();
                    if (!videoUrl) continue;

                    picked = {
                        videoUrl,
                        clickThrough: inline.querySelector('ClickThrough')?.textContent?.trim() || '',
                        impressionUrl: inline.querySelector('Impression')?.textContent?.trim() || '',
                        startUrl: inline.querySelector('Tracking[event="start"]')?.textContent?.trim() || '',
                    };
                    break;
                }

                setAd(picked);
                setFetchDone(true);
            })
            .catch(() => {
                setFetchDone(true); // fetch lỗi → dismiss ở effect bên dưới
            });

        return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, isPremium]);

    // Nếu fetch xong nhưng không parse được ad → dismiss
    useEffect(() => {
        if (fetchDone && !ad) dismiss();
    }, [fetchDone, ad, dismiss]);

    // ── Countdown ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!ad || dismissed) return;
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [ad, dismissed]);

    // ── Video event handlers ─────────────────────────────────────────────────
    const handlePlay = () => {
        if (!tracked.current.impression) {
            tracked.current.impression = true;
            ping(ad?.impressionUrl || '');
        }
        if (!tracked.current.start) {
            tracked.current.start = true;
            ping(ad?.startUrl || '');
        }
    };

    const handleClick = () => {
        if (ad?.clickThrough) window.open(ad.clickThrough, '_blank', 'noopener,noreferrer');
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newMuted = !muted;
        setMuted(newMuted);
        if (videoRef.current) videoRef.current.muted = newMuted;
    };

    // ── Render guard ─────────────────────────────────────────────────────────
    if (loading || isPremium || dismissed) return null;

    const canSkip = countdown <= 0;

    return (
        <div
            className="absolute inset-0 z-50 flex flex-col bg-black overflow-hidden"
            style={{ borderRadius: 'inherit' }}
        >
            {/* Poster blur khi đang fetch VAST */}
            {!ad && poster && (
                <div
                    className="absolute inset-0 bg-cover bg-center scale-110"
                    style={{ backgroundImage: `url(${poster})`, filter: 'blur(20px) brightness(0.25)' }}
                />
            )}

            {/* Loading spinner */}
            {!fetchDone && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-white/60 text-sm font-medium">Đang tải quảng cáo…</span>
                </div>
            )}

            {/* Video ad */}
            {ad && (
                <video
                    ref={videoRef}
                    src={ad.videoUrl}
                    autoPlay
                    muted={muted}
                    playsInline
                    className="w-full h-full object-cover cursor-pointer"
                    onPlay={handlePlay}
                    onClick={handleClick}
                    onEnded={dismiss}
                />
            )}

            {/* Top HUD */}
            {ad && (
                <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent z-20">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40 select-none pointer-events-none">
                        Quảng cáo
                    </span>
                    <button
                        onClick={toggleMute}
                        className="p-2 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-all"
                        title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                    >
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                </div>
            )}

            {/* Bottom skip bar */}
            {ad && (
                <div className="absolute bottom-0 inset-x-0 flex items-center justify-end px-4 py-4 bg-gradient-to-t from-black/70 to-transparent z-20">
                    <button
                        id="preroll-skip-btn"
                        onClick={() => canSkip && dismiss()}
                        disabled={!canSkip}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all select-none border ${
                            canSkip
                                ? 'bg-white text-black hover:bg-white/90 border-transparent cursor-pointer shadow-lg shadow-black/30'
                                : 'bg-black/40 text-white/50 border-white/20 cursor-not-allowed'
                        }`}
                    >
                        {canSkip ? (
                            <><SkipForward className="w-4 h-4" />Bỏ qua quảng cáo</>
                        ) : (
                            <><X className="w-4 h-4" />Bỏ qua sau {countdown}s</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
