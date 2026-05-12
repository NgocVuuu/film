'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { X, SkipForward } from 'lucide-react';

// ── Config ───────────────────────────────────────────────────────────────────
// ⚠️ VAST URL không dùng được với iframe — cần lấy Mã HTML từ Hilltop dashboard
// Để trống = pre-roll tắt hoàn toàn (tạm thời)
const AD_PREROLL_URL = process.env.NEXT_PUBLIC_AD_PREROLL_URL ||
    'https://difficultblock.com/d/mjF/z.dgGQN/vVZTG/UZ/feJmy9/uzZOUClIk_PMT/cfwmMtzzczy-NTjsETtoNtzLAozWNpzGIh2bNzQP';
const SKIP_AFTER_SEC = 7; // Đồng bộ với Hilltop VAST "Bỏ qua độ trễ đầu video" = 7s
// ─────────────────────────────────────────────────────────────────────────────

interface PreRollAdProps {
    /** Called when the user dismisses the ad (skip or ended) — start real player */
    onDismiss: () => void;
    /** Thumbnail of the movie — used as the blurred background while the ad loads */
    poster?: string;
}

export function PreRollAd({ onDismiss, poster }: PreRollAdProps) {
    const { user, loading } = useAuth();
    const [countdown, setCountdown] = useState(SKIP_AFTER_SEC);
    const [dismissed, setDismissed] = useState(false);
    const [adLoaded, setAdLoaded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const adUrl = AD_PREROLL_URL;
    const isPremium = user?.isPremium;

    // Dismiss helper — idempotent
    const dismiss = useCallback(() => {
        if (dismissed) return;
        setDismissed(true);
        if (timerRef.current) clearInterval(timerRef.current);
        onDismiss();
    }, [dismissed, onDismiss]);

    // Auto-dismiss for premium users or missing env — after auth resolves
    useEffect(() => {
        if (loading) return;
        if (isPremium || !adUrl) {
            dismiss();
        }
    }, [loading, isPremium, adUrl, dismiss]);

    // Countdown tick
    useEffect(() => {
        if (loading || isPremium || !adUrl || dismissed) return;
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, isPremium, adUrl]);

    // Inject ad iframe once auth has resolved
    useEffect(() => {
        if (loading || isPremium || !adUrl || !containerRef.current || iframeRef.current) return;

        const iframe = document.createElement('iframe');
        iframe.src = adUrl;
        iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('allow', 'autoplay; fullscreen');
        iframe.setAttribute('scrolling', 'no');
        // Bỏ allow-same-origin để SW của trang cha không can thiệp vào request trong iframe
        iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-forms allow-top-navigation-by-user-activation');
        iframe.onload = () => setAdLoaded(true);

        containerRef.current.appendChild(iframe);
        iframeRef.current = iframe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, isPremium, adUrl]);

    // While auth is loading, or user is premium / no ad configured — render nothing
    if (loading || isPremium || !adUrl || dismissed) return null;

    const canSkip = countdown <= 0;

    return (
        <div
            className="absolute inset-0 z-50 flex flex-col bg-black overflow-hidden"
            style={{ borderRadius: 'inherit' }}
        >
            {/* Blurred poster as background while ad loads */}
            {poster && !adLoaded && (
                <div
                    className="absolute inset-0 bg-cover bg-center scale-110"
                    style={{
                        backgroundImage: `url(${poster})`,
                        filter: 'blur(20px) brightness(0.3)',
                    }}
                />
            )}

            {/* Loading shimmer */}
            {!adLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-white/60 text-sm font-medium">Đang tải quảng cáo…</span>
                </div>
            )}

            {/* Ad iframe container */}
            <div
                ref={containerRef}
                className="flex-1 w-full relative z-0"
            />

            {/* Top HUD bar */}
            <div className="absolute top-0 inset-x-0 flex items-center px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none">
                <span className="text-xs font-bold uppercase tracking-widest text-white/40 select-none">
                    Quảng cáo
                </span>
            </div>

            {/* Bottom action bar */}
            <div className="absolute bottom-0 inset-x-0 flex items-center justify-end px-4 py-4 bg-gradient-to-t from-black/80 to-transparent z-20">
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
                        <>
                            <SkipForward className="w-4 h-4" />
                            Bỏ qua quảng cáo
                        </>
                    ) : (
                        <>
                            <X className="w-4 h-4" />
                            Bỏ qua sau {countdown}s
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
