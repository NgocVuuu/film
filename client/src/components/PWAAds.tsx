'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

// ── Cấu hình qua env vars ─────────────────────────────────────────────────────
// NEXT_PUBLIC_AD_WATCH_SCRIPT   — Adsterra script URL cho watch page (nhỏ, trên player)
// NEXT_PUBLIC_AD_HOME_SCRIPT    — Adsterra script URL cho home page (dưới cùng)
// NEXT_PUBLIC_AD_INLINE_SCRIPT  — Adsterra script URL cho các trang danh sách / chi tiết
// ─────────────────────────────────────────────────────────────────────────────

export type AdVariant = 'watch' | 'home' | 'inline' | 'inline2';

interface PWAAdsProps {
    variant?: AdVariant;
}

export function PWAAds({ variant = 'home' }: PWAAdsProps) {
    const { user, loading } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);

    const scriptSrc =
        variant === 'watch'   ? process.env.NEXT_PUBLIC_AD_WATCH_SCRIPT :
        variant === 'inline'  ? process.env.NEXT_PUBLIC_AD_INLINE_SCRIPT :
        variant === 'inline2' ? process.env.NEXT_PUBLIC_AD_INLINE2_SCRIPT :
                                process.env.NEXT_PUBLIC_AD_HOME_SCRIPT;

    const isPremium = user?.isPremium;

    // Dimensions cho atOptions theo từng variant
    const adDimensions =
        variant === 'watch'   ? { width: 728, height: 90  } :
        variant === 'inline'  ? { width: 320, height: 50  } :
        variant === 'inline2' ? { width: 468, height: 60  } :
                                { width: 300, height: 250 };

    // Chờ auth resolve xong mới inject — tránh inject cho premium user
    useEffect(() => {
        if (loading || isPremium || !scriptSrc || !containerRef.current || loaded) return;
        setLoaded(true);

        // Extract key từ URL: //www.highperformanceformat.com/{key}/invoke.js
        const key = scriptSrc.match(/\/([a-f0-9]{32})\//)?.[1];
        if (!key) return;

        // Dùng iframe truy cập local html để cô lập atOptions & giữ Referrer xịn (domain pchill.online)
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `border:none;width:${adDimensions.width}px;height:${adDimensions.height}px;display:block;`;
        iframe.setAttribute('scrolling', 'no');
        
        // Trang ad-slot.html sẽ chịu trách nhiệm gen atOptions và document.write()
        iframe.src = `/ad-slot.html?key=${key}&w=${adDimensions.width}&h=${adDimensions.height}&src=${encodeURIComponent(scriptSrc)}`;
        
        containerRef.current.appendChild(iframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    // Ẩn hoàn toàn với premium users và khi chưa cấu hình script
    if (!loading && (isPremium || !scriptSrc)) return null;

    // Placeholder khi đang resolve auth
    const showPlaceholder = loading;

    if (variant === 'watch') {
        return (
            <div
                ref={showPlaceholder ? undefined : containerRef}
                className="w-full overflow-hidden rounded-lg bg-white/5 border border-dashed border-white/15 min-h-12.5 flex items-center justify-center"
                aria-label="Advertisement"
            >
                {showPlaceholder && (
                    <span className="text-[11px] font-semibold tracking-widest uppercase text-white/30 select-none">
                        — AD · watch —
                    </span>
                )}
            </div>
        );
    }

    if (variant === 'inline' || variant === 'inline2') {
        return (
            <div
                ref={showPlaceholder ? undefined : containerRef}
                className="w-full overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/5 min-h-16 flex items-center justify-center my-4"
                aria-label="Advertisement"
            >
                {showPlaceholder && (
                    <span className="text-xs font-semibold tracking-widest uppercase text-white/30 select-none">
                        — AD · {variant} —
                    </span>
                )}
            </div>
        );
    }

    // Home page bottom
    return (
        <div
            ref={showPlaceholder ? undefined : containerRef}
                className="w-full overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/5 min-h-22.5 flex items-center justify-center mx-auto max-w-4xl"
            aria-label="Advertisement"
        >
            {showPlaceholder && (
                <span className="text-xs font-semibold tracking-widest uppercase text-white/30 select-none">
                    — AD · home —
                </span>
            )}
        </div>
    );
}

