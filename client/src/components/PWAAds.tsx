'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

// ── Cấu hình qua env vars ─────────────────────────────────────────────────────
// NEXT_PUBLIC_AD_WATCH_SCRIPT   — Adsterra script URL cho watch page (nhỏ, trên player)
// NEXT_PUBLIC_AD_HOME_SCRIPT    — Adsterra script URL cho home page (dưới cùng)
// NEXT_PUBLIC_AD_INLINE_SCRIPT  — Adsterra script URL cho các trang danh sách / chi tiết
// ─────────────────────────────────────────────────────────────────────────────

export type AdVariant = 'watch' | 'home' | 'inline';

interface PWAAdsProps {
    variant?: AdVariant;
}

export function PWAAds({ variant = 'home' }: PWAAdsProps) {
    const { user, loading } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);

    const scriptSrc =
        variant === 'watch'  ? process.env.NEXT_PUBLIC_AD_WATCH_SCRIPT :
        variant === 'inline' ? process.env.NEXT_PUBLIC_AD_INLINE_SCRIPT :
                               process.env.NEXT_PUBLIC_AD_HOME_SCRIPT;

    const isPremium = user?.isPremium;

    // Dimensions cho atOptions theo từng variant
    const adDimensions =
        variant === 'watch'  ? { width: 728, height: 90  } :
        variant === 'inline' ? { width: 320, height: 50  } :
                               { width: 300, height: 250 };

    // Chờ auth resolve xong mới inject — tránh inject cho premium user
    useEffect(() => {
        if (loading || isPremium || !scriptSrc || !containerRef.current || loaded) return;
        setLoaded(true);

        // Extract key từ URL: //www.highperformanceformat.com/{key}/invoke.js
        const key = scriptSrc.match(/\/([a-f0-9]{32})\//)?.[1];

        // Script 1: atOptions config (bắt buộc với Adsterra Banner)
        if (key) {
            const optScript = document.createElement('script');
            optScript.text = `atOptions = {'key':'${key}','format':'iframe','height':${adDimensions.height},'width':${adDimensions.width},'params':{}};`;
            containerRef.current.appendChild(optScript);
        }

        // Script 2: invoke.js
        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        containerRef.current.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    // Placeholder: hiện khi đang load auth, khi Premium, hoặc chưa cấu hình script
    const showPlaceholder = loading || isPremium || !scriptSrc;

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

    if (variant === 'inline') {
        return (
            <div
                ref={showPlaceholder ? undefined : containerRef}
                className="w-full overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/5 min-h-16 flex items-center justify-center my-4"
                aria-label="Advertisement"
            >
                {showPlaceholder && (
                    <span className="text-xs font-semibold tracking-widest uppercase text-white/30 select-none">
                        — AD · inline —
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
