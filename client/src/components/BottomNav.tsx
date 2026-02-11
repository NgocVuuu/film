'use client';

import { Home, Search, Heart, User, Film } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
    const pathname = usePathname();

    const links = [
        {
            name: 'Trang chủ',
            href: '/',
            icon: Home
        },
        {
            name: 'Tìm kiếm',
            href: '/search',
            icon: Search
        },
        {
            name: 'Yêu thích',
            href: '/favorites',
            icon: Heart
        },
        {
            name: 'Cá nhân',
            href: '/profile',
            icon: User
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-t border-white/10 lg:hidden pb-safe">
            <div className="flex justify-around items-center h-16">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-medium">{link.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
