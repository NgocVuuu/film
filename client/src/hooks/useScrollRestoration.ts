'use client';
import { useEffect, useRef } from 'react';

const KEY = 'scroll_home';

/**
 * Saves scroll position when leaving home page, restores it after content loads.
 * @param ready - pass true when async content has finished rendering
 */
export function useScrollRestoration(ready: boolean) {
    const restored = useRef(false);

    // Save position on unmount (user navigates away)
    useEffect(() => {
        return () => {
            sessionStorage.setItem(KEY, String(Math.round(window.scrollY)));
        };
    }, []);

    // Restore position once content is ready
    useEffect(() => {
        if (!ready || restored.current) return;
        const saved = sessionStorage.getItem(KEY);
        if (saved && parseInt(saved, 10) > 0) {
            const y = parseInt(saved, 10);
            // rAF ensures DOM is painted before scrolling
            requestAnimationFrame(() => {
                window.scrollTo({ top: y, behavior: 'instant' });
                restored.current = true;
            });
        }
    }, [ready]);
}
