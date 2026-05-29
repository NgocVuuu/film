'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';

const SMARTLINK_URL = 'https://www.effectivecpmnetwork.com/ymvcj08wdc?key=d13c3bfc1b46a1af5fd851f84b923aec';
const CLICKS_BEFORE_NEXT_AD = 5; // Cần 5 lượt click rác/an toàn trước khi hiện lại quảng cáo
const STORAGE_KEY = 'ad_popunder_click_count';

export function GlobalPopunder() {
    const { user, loading } = useAuth();
    const eventAttached = useRef(false);

    useEffect(() => {
        // Đợi auth load xong. Nếu là VIP/Premium thì không bao giờ dính quảng cáo
        if (loading || user?.isPremium || user?.isVip) return;
        if (eventAttached.current) return;

        const handleDocumentClick = () => {
            const clickCountStr = localStorage.getItem(STORAGE_KEY);
            // Mặc định cho phép hiển thị nếu chưa có data (click đầu tiên của người dùng mới)
            let shouldShow = true;
            let currentClicks = 0;

            if (clickCountStr) {
                currentClicks = parseInt(clickCountStr, 10);
                if (currentClicks < CLICKS_BEFORE_NEXT_AD) {
                    shouldShow = false;
                }
            }

            if (shouldShow) {
                // Tới lúc hiển thị quảng cáo sang tab mới
                const opened = window.open(SMARTLINK_URL, '_blank');
                if (opened) {
                    // Nếu mở tab thành công, reset bộ đếm về 0
                    localStorage.setItem(STORAGE_KEY, '0');
                }
            } else {
                // Người dùng đang trong "thời gian ân xá", tăng biến đếm click lên 1
                localStorage.setItem(STORAGE_KEY, (currentClicks + 1).toString());
            }
        };

        // Bắt sự kiện click toàn bộ trang
        document.addEventListener('click', handleDocumentClick, { capture: true });
        eventAttached.current = true;

        return () => {
            document.removeEventListener('click', handleDocumentClick, { capture: true });
            eventAttached.current = false;
        };
    }, [loading, user]);

    return null;
}
