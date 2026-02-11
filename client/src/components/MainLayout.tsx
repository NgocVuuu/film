'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // Start with /admin check
    const isAdmin = pathname?.startsWith('/admin');

    return (
        <>
            {!isAdmin && <Navbar />}
            <main className={`flex-1 ${!isAdmin ? 'pt-16 pb-20 lg:pb-8' : ''}`}>
                {children}
            </main>
            {!isAdmin && (
                <>
                    <BottomNav />
                    <Footer />
                </>
            )}
        </>
    );
}
