'use client';

import { X, Crown, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import Link from 'next/link';

import { useAuth } from '@/contexts/auth-context';

export function PWAAds() {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible || user?.isPremium) return null;

    return (
        <div className="mx-4 mt-2 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="relative overflow-hidden rounded-xl bg-linear-to-r from-surface-900 to-surface-800 border border-yellow-500/20 shadow-xl">
                {/* Decorative background elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl"></div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 border border-yellow-500/30">
                        <Crown className="w-6 h-6 text-yellow-500" />
                    </div>

                    <div className="flex-1 min-w-0 font-vietnamese">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5 leading-tight mb-0.5 font-vietnamese">
                            Lên đời Premium, &apos;Buff&apos; App cực đỉnh! <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                        </h4>
                        <p className="text-[11px] text-gray-400 leading-tight font-vietnamese">
                            Nâng cấp ngay để &apos;thay áo&apos; ánh kim sang trọng, xóa mọi quảng cáo và nhận tin phim hot tức thì sếp ơi!
                        </p>
                    </div>

                    <Link href="/pricing" className="shrink-0">
                        <Button
                            size="sm"
                            className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold h-8 px-3 rounded-lg shadow-lg shadow-yellow-500/20"
                        >
                            Nâng cấp
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
