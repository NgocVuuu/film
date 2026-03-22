'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    poster_url?: string;
    year: number;
    episode_current?: string;
    quality?: string;
    lang?: string;
    category?: { name: string }[];
    content?: string;
}

interface QuickViewContextType {
    showQuickView: (movie: Movie) => void;
    hideQuickView: () => void;
}

const QuickViewContext = createContext<QuickViewContextType | undefined>(undefined);

export function QuickViewProvider({ children }: { children: ReactNode }) {
    const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        setActiveMovie(null);
    }, [pathname]);

    const showQuickView = (movie: Movie) => {
        // Haptic feedback if available
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
        setActiveMovie(movie);
    };

    const hideQuickView = () => setActiveMovie(null);

    return (
        <QuickViewContext.Provider value={{ showQuickView, hideQuickView }}>
            {children}
            {activeMovie && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300"
                    onClick={hideQuickView}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                    
                    <div 
                        className="relative w-full max-w-sm bg-surface-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300 transform-gpu"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button 
                            onClick={hideQuickView}
                            className="absolute top-4 right-4 z-30 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Background Poster */}
                        <div className="relative aspect-video w-full overflow-hidden">
                            <img 
                                src={activeMovie.poster_url || activeMovie.thumb_url} 
                                alt={activeMovie.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-surface-900 via-surface-900/40 to-transparent" />
                        </div>

                        {/* Content */}
                        <div className="p-5 pt-2">
                            <h2 className="text-xl font-black text-white mb-0.5 leading-tight">{activeMovie.name}</h2>
                            <div className="flex flex-col gap-1.5 mb-4">
                                <p className="text-[13px] text-gray-400 font-medium italic">{activeMovie.origin_name}</p>
                                
                                <div className="flex items-center gap-2 text-[11px] text-primary font-bold">
                                    <span className="bg-primary/20 px-1.5 py-0.5 rounded border border-primary/30">
                                        {activeMovie.year}
                                    </span>
                                    {activeMovie.episode_current && (
                                        <span className="bg-primary/20 px-1.5 py-0.5 rounded border border-primary/30 uppercase text-[10px]">
                                            {activeMovie.lang?.toLowerCase().includes('thuyết minh') ? 'TM' : 
                                             activeMovie.lang?.toLowerCase().includes('lồng tiếng') ? 'LT' : 'VS'} {activeMovie.episode_current.replace(/Tập\s*/i, '').replace(/\s*Hoàn\s*tất/i, '').trim()}
                                        </span>
                                    )}
                                    <span className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10 text-white/70">
                                        {activeMovie.quality || 'HD'}
                                    </span>
                                </div>

                                {/* Genres / Categories Placeholder (if available in movie object) */}
                                {(activeMovie as any).category && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {(activeMovie as any).category.slice(0, 3).map((cat: any) => (
                                            <span key={cat.name} className="text-[10px] bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-full">
                                                {cat.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Short Description */}
                            <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-4 mb-5 pb-1 border-b border-white/5">
                                {activeMovie.content || 'Đang cập nhật nội dung...'}
                            </p>
                            
                            <div className="flex items-center gap-2">
                                <Link href={`/movie/${activeMovie.slug}/watch`} onClick={hideQuickView} className="flex-1">
                                    <Button className="w-full bg-primary text-black font-black h-11 rounded-xl flex items-center justify-center gap-2 hover:bg-gold-400 text-xs shadow-lg shadow-primary/20 uppercase">
                                        <Play fill="black" className="w-4 h-4" />
                                        Xem ngay
                                    </Button>
                                </Link>
                                <Link href={`/movie/${activeMovie.slug}`} onClick={hideQuickView} className="flex-1">
                                    <Button variant="outline" className="w-full border-white/10 text-white font-bold h-11 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 text-xs bg-white/5 uppercase">
                                        <Info className="w-4 h-4" />
                                        Chi tiết
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </QuickViewContext.Provider>
    );
}

export const useQuickView = () => {
    const context = useContext(QuickViewContext);
    if (!context) throw new Error('useQuickView must be used within QuickViewProvider');
    return context;
};
