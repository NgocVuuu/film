'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { usePWA } from '@/hooks/usePWA';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, Suspense } from 'react';
import { NotificationProvider } from '@/contexts/notification-context';
import { Trophy, PlayCircle } from 'lucide-react';
import Link from 'next/link';

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

    const isHome = pathname === '/';
    // Hide top navbar on PWA if not on home page, and also hide it on watch page (it has its own header)
    const showNavbar = !isAdmin && !isWatchPage && (!isPWA || isHome);
    const isProfile = pathname?.startsWith('/profile');
    // Hide footer on PWA entirely, and on Profile page to allow fullscreen layout
    const showFooter = !isAdmin && !isPWA && !isProfile;

    // Do not apply top padding on the Home page so the HeroSlider can sit directly underneath the transparent Navbar.
    const applyTopPadding = showNavbar && !isHome;
    const pwaSafePadding = !showNavbar && !isHome && !isWatchPage && !isProfile;

    return (
        <NotificationProvider>
            {showNavbar && (
                <Suspense fallback={null}>
                    <Navbar />
                </Suspense>
            )}
            <main className={`flex-1 ${!isAdmin ? `${applyTopPadding ? 'pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-16' : pwaSafePadding ? 'pt-[env(safe-area-inset-top)]' : 'pt-0'} ${showFooter ? 'pb-32' : 'pb-24'} ${isProfile ? 'lg:pb-0' : 'lg:pb-8'}` : ''}`}>
                {children}
            </main>
            {!isAdmin && (
                <>
                    <Suspense fallback={null}>
                        <BottomNav />
                    </Suspense>
                    {showFooter && <Footer />}
                    
                    {/* Desktop Floating Features */}
                    <div className="hidden md:flex fixed top-1/2 right-4 -translate-y-1/2 flex-col gap-4 z-50">
                        <Link 
                            href="/leaderboard" 
                            title="Bảng Xếp Hạng"
                            className="w-12 h-12 bg-surface-900/80 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:scale-110 hover:bg-yellow-500/20 hover:border-yellow-500/50 hover:text-yellow-400 transition-all group relative"
                        >
                            <Trophy className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
                            <span className="absolute right-full mr-3 bg-surface-900 text-gray-300 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-white/10">Bảng Xếp Hạng</span>
                        </Link>
                        <Link 
                            href="/moments" 
                            title="Khoảnh Khắc"
                            className="w-12 h-12 bg-surface-900/80 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:scale-110 hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all group relative"
                        >
                            <PlayCircle className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                            <span className="absolute right-full mr-3 bg-surface-900 text-gray-300 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-white/10">Khoảnh Khắc</span>
                        </Link>
                    </div>
                </>
            )}
        </NotificationProvider>
    );
}
