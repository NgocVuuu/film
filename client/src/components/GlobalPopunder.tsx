'use client';

import Script from 'next/script';
import { useAuth } from '@/contexts/auth-context';
import { usePathname } from 'next/navigation';

export function GlobalPopunder() {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    
    // Nếu đang tải trạng thái đăng nhập hoặc user là VIP/Premium thì không render
    if (loading || user?.isPremium || user?.isVip) {
        return null;
    }

    // CHỈ hiển thị popunder ở trang xem phim (URL kết thúc bằng /watch)
    if (!pathname.endsWith('/watch')) {
        return null;
    }

    return (
        <Script 
            src="https://pl28880625.profitablecpmratenetwork.com/76/ce/82/76ce828afa458f5b89f1dcae1ea7ccd1.js" 
            strategy="afterInteractive" 
        />
    );
}
