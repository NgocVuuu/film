'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { usePWA } from '@/hooks/usePWA';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { isPWA } = usePWA();
    // Start with /admin check
    const isAdmin = pathname?.startsWith('/admin');

    // Hide top navbar on PWA if not on home page
    const showNavbar = !isAdmin && (!isPWA || pathname === '/');
    // Hide footer on PWA entirely
    const showFooter = !isAdmin && !isPWA;

    return (
        <>
            {showNavbar && <Navbar />}
            <main className={`flex-1 ${!isAdmin ? `${showNavbar ? 'pt-14 md:pt-16' : 'pt-0'} ${showFooter ? 'pb-32' : 'pb-24'} lg:pb-8` : ''}`}>
                {children}
            </main>
            {!isAdmin && (
                <>
                    <BottomNav />
                    {showFooter && <Footer />}
                </>
            )}
        </>
    );
}
