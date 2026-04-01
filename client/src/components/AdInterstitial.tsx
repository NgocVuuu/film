'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { X } from 'lucide-react';

// ── Cấu hình ─────────────────────────────────────────────────────────────────
// NEXT_PUBLIC_AD_INTERSTITIAL_SCRIPT — Adsterra script URL cho interstitial
const PAGE_THRESHOLD = 3;      // Hiện sau bao nhiêu lần chuyển trang
const COUNTDOWN_SEC  = 5;      // Giây đếm ngược trước khi cho đóng
const SESSION_KEY    = 'ad_interstitial_shown';
const COUNT_KEY      = 'ad_page_count';
// ─────────────────────────────────────────────────────────────────────────────

export function AdInterstitial() {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const [visible, setVisible]     = useState(false);
    const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
    const containerRef   = useRef<HTMLDivElement>(null);
    const scriptInjected = useRef(false);

    const scriptSrc = process.env.NEXT_PUBLIC_AD_INTERSTITIAL_SCRIPT;

    // Đếm số trang đã visit trong session, trigger khi đủ threshold
    useEffect(() => {
        if (loading) return;          // chờ auth resolve
        if (!scriptSrc) return;       // không hiện overlay khi chưa cấu hình script
        if (user?.isPremium) return;  // premium không thấy quảng cáo
        if (sessionStorage.getItem(SESSION_KEY)) return; // đã hiện rồi trong session

        const count = parseInt(sessionStorage.getItem(COUNT_KEY) || '0') + 1;
        sessionStorage.setItem(COUNT_KEY, String(count));

        if (count >= PAGE_THRESHOLD) {
            sessionStorage.setItem(SESSION_KEY, '1'); // đánh dấu đã hiện
            setCountdown(COUNTDOWN_SEC);
            setVisible(true);
        }
    // pathname thay đổi = người dùng vào trang mới
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, loading]);

    // Đếm ngược
    useEffect(() => {
        if (!visible || countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [visible, countdown]);

    // Inject script 1 lần khi overlay mở
    useEffect(() => {
        if (!visible || scriptInjected.current || !containerRef.current || !scriptSrc) return;
        scriptInjected.current = true;

        // Extract key từ URL rồi inject atOptions trước (Adsterra Banner yêu cầu)
        const key = scriptSrc.match(/\/([a-f0-9]{32})\//)?.[1] || '';
        
        const iframe = document.createElement('iframe');
        iframe.sandbox = "allow-scripts allow-popups allow-same-origin"; // KHÔNG CHO PHÉP allow-top-navigation
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <style>body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background-color: transparent; overflow: hidden; }</style>
                </head>
                <body>
                    <script>
                        var atOptions = {
                            'key': '${key}',
                            'format': 'iframe',
                            'height': 300,
                            'width': 160,
                            'params': {}
                        };
                    </script>
                    <script type="text/javascript" src="${scriptSrc}"></script>
                </body>
            </html>
        `;

        iframe.srcdoc = htmlContent;
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(iframe);
    }, [visible, scriptSrc]);

    if (!visible) return null;

    const canClose = countdown <= 0;

    return (
        <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
                // Đóng khi click ra ngoài container (và đã hết đếm ngược)
                if (canClose && e.target === e.currentTarget) setVisible(false);
            }}
        >
            <div className="relative w-full max-w-2xl mx-4">
                {/* Nút đóng / đếm ngược */}
                <div className="absolute -top-11 right-0 flex items-center gap-2">
                    <button
                        onClick={() => canClose && setVisible(false)}
                        disabled={!canClose}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all select-none ${
                            canClose
                                ? 'bg-white/15 hover:bg-white/25 text-white cursor-pointer'
                                : 'bg-white/5 text-white/40 cursor-not-allowed'
                        }`}
                    >
                        {canClose ? (
                            <><X className="w-4 h-4" />Đóng quảng cáo</>
                        ) : (
                            `Đóng sau ${countdown}s`
                        )}
                    </button>
                </div>

                {/* Ad container */}
                <div
                    ref={containerRef}
                    className="w-full min-h-64 rounded-xl overflow-hidden bg-surface-900 border border-white/10 flex items-center justify-center"
                >
                    {/* Placeholder — hiện khi chưa cấu hình script */}
                    {!scriptSrc && (
                        <div className="flex flex-col items-center gap-2 py-12">
                            <span className="text-white/20 text-xs tracking-widest uppercase select-none">
                                — Quảng cáo Interstitial —
                            </span>
                            <span className="text-white/10 text-[10px]">
                                Set NEXT_PUBLIC_AD_INTERSTITIAL_SCRIPT to enable
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
