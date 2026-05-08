'use client';

import Script from 'next/script';
import { useAuth } from '@/contexts/auth-context';

export function GlobalPopunder() {
    const { user, loading } = useAuth();
    
    // Nếu đang tải trạng thái đăng nhập hoặc user là VIP thì không render script quảng cáo Popunder
    if (loading || user?.isPremium) {
        return null;
    }

    return (
        <Script 
            src="https://pl28880625.profitablecpmratenetwork.com/76/ce/82/76ce828afa458f5b89f1dcae1ea7ccd1.js" 
            strategy="afterInteractive" 
        />
    );
}
