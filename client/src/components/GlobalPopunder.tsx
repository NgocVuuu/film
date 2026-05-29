'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';

const SMARTLINK_URL = 'https://www.effectivecpmnetwork.com/ymvcj08wdc?key=d13c3bfc1b46a1af5fd851f84b923aec';
const POPUNDER_COOLDOWN_HOURS = 12; // 12 tiếng mới bị nhảy tab 1 lần
const STORAGE_KEY = 'ad_popunder_last_shown';

export function GlobalPopunder() {
    const { user, loading } = useAuth();
    const eventAttached = useRef(false);

    useEffect(() => {
        // Đợi auth load xong. Nếu là VIP/Premium thì không bao giờ dính quảng cáo
        if (loading || user?.isPremium || user?.isVip) return;
        if (eventAttached.current) return;

        const handleFirstClick = () => {
            const lastShownStr = localStorage.getItem(STORAGE_KEY);
            let shouldShow = true;

            if (lastShownStr) {
                const lastShown = parseInt(lastShownStr, 10);
                const hoursPassed = (Date.now() - lastShown) / (1000 * 60 * 60);
                if (hoursPassed < POPUNDER_COOLDOWN_HOURS) {
                    shouldShow = false;
                }
            }

            if (shouldShow) {
                // Mở smartlink sang tab mới
                const opened = window.open(SMARTLINK_URL, '_blank');
                // Nếu trình duyệt cho phép mở (không bị chặn popup cứng)
                if (opened) {
                    // Lưu lại thời điểm bị dính quảng cáo
                    localStorage.setItem(STORAGE_KEY, Date.now().toString());
                }
            }
        };

        // Bắt sự kiện click ở mức document, dùng capture: true để chặn ngay lập tức
        document.addEventListener('click', handleFirstClick, { capture: true });
        eventAttached.current = true;

        return () => {
            document.removeEventListener('click', handleFirstClick, { capture: true });
            eventAttached.current = false;
        };
    }, [loading, user]);

    return null;
}
