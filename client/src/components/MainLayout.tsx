'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { usePWA } from '@/hooks/usePWA';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';
import { NotificationProvider } from '@/contexts/notification-context';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { isPWA } = usePWA();
    const { user } = useAuth();

    // Apply premium theme class to body
    useEffect(() => {
        if (typeof document !== 'undefined') {
            if (user?.isPremium) {
                document.body.classList.add('premium-theme');
            } else {
                document.body.classList.remove('premium-theme');
            }
        }
    }, [user?.isPremium]);

    // Start with /admin check
    const isAdmin = pathname?.startsWith('/admin');
    const isWatchPage = pathname?.includes('/watch');

    // Hide top navbar on PWA if not on home page, and also hide it on watch page (it has its own header)
    const showNavbar = !isAdmin && !isWatchPage && (!isPWA || pathname === '/');
    // Hide footer on PWA entirely
    const showFooter = !isAdmin && !isPWA;


    return (
        <NotificationProvider>
            {showNavbar && <Navbar />}
            <main className={`flex-1 ${!isAdmin ? `${showNavbar ? 'pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-16' : 'pt-[env(safe-area-inset-top)]'} ${showFooter ? 'pb-32' : 'pb-24'} lg:pb-8` : ''}`}>
                {children}
            </main>
            {!isAdmin && (
                <>
                    <BottomNav />
                    {showFooter && <Footer />}
                </>
            )}
        </NotificationProvider>
    );
}
