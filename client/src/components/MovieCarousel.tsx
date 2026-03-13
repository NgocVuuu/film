'use client';
import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useLongPress } from '@/hooks/useLongPress';
import { useQuickView } from '@/contexts/QuickViewContext';

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    year: number;
    poster_url?: string;
    episode_current?: string;
    quality?: string;
    lang?: string;
    progress?: {
        currentTime: number;
        duration: number;
        percentage: number;
        episodeSlug: string;
        episodeName: string;
    };
}

interface MovieCarouselProps {
    title: string;
    movies: Movie[];
    icon?: React.ReactNode;
    viewAllLink?: string;
}

export function MovieCarousel({ title, movies, icon, viewAllLink }: MovieCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { showQuickView } = useQuickView();

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    const getBadges = (quality?: string, episode?: string, lang?: string) => {
        const q = quality?.toLowerCase() || '';
        const l = lang?.toLowerCase() || '';
        const epClean = episode?.replace(/Tập\s*/i, '').replace(/\s*Hoàn\s*tất/i, '').trim() || '';
        
        const checkString = (l + ' ' + q);
        const badges: { display: string; classes: string }[] = [];

        if (checkString.includes('vietsub')) {
            badges.push({
                display: epClean ? `VS ${epClean}` : 'VS',
                classes: 'bg-yellow-500 text-black border-yellow-400/50'
            });
        }

        if (checkString.includes('thuyết minh')) {
            badges.push({
                display: epClean ? `TM ${epClean}` : 'TM',
                classes: 'bg-orange-500 text-white border-orange-400/50'
            });
        }

        if (checkString.includes('lồng tiếng')) {
            badges.push({
                display: epClean ? `LT ${epClean}` : 'LT',
                classes: 'bg-[#8B4513] text-white border-orange-900/50'
            });
        }

        if (badges.length === 0 && (l || q)) {
            badges.push({
                display: epClean ? `VS ${epClean}` : 'VS',
                classes: 'bg-yellow-500 text-black border-yellow-400/50'
            });
        }

        return badges;
    };

    if (!movies || movies.length === 0) return null;

    return (
        <div className="py-1 md:py-2 space-y-1">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-lg md:text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary to-yellow-200 flex items-center gap-3">
                    {icon && <span className="text-primary">{icon}</span>}
                    {title}
                </h2>
                {viewAllLink && (
                    <Link href={viewAllLink} className="text-gray-400 hover:text-primary transition-all group p-1">
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </Link>
                )}
            </div>

            <div className="relative group/carousel">
                {/* Navigation Buttons */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-primary/90 hover:text-black p-3 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-all -translate-x-1/2 group-hover/carousel:translate-x-4 backdrop-blur-sm border border-white/10 hidden md:block"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-primary/90 hover:text-black p-3 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-all translate-x-1/2 group-hover/carousel:-translate-x-4 backdrop-blur-sm border border-white/10 hidden md:block"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>

                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-4 px-4 pb-4 scrollbar-hide snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {movies.map((movie) => {
                        const longPressHandlers = useLongPress(() => {
                            showQuickView(movie as any);
                        }, { shouldPreventDefault: false });
                        const movieBadges = getBadges(movie.quality, movie.episode_current, movie.lang);

                        return (
                            <Link
                                key={movie._id}
                                href={`/movie/${movie.slug}`}
                                {...longPressHandlers}
                                className="bg-surface-800 rounded-lg overflow-hidden border border-border/50 shadow-lg relative snap-start w-[31vw] md:w-50 shrink-0 group transition-all duration-300 hover:scale-[1.03] hover:shadow-primary/20"
                                style={{ 
                                    willChange: 'transform',
                                    backfaceVisibility: 'hidden'
                                }}
                            >
                                {/* Image */}
                                <div className="aspect-2/3 w-full relative overflow-hidden">
                                    <Image
                                        src={movie.thumb_url}
                                        alt={movie.name}
                                        fill
                                        sizes="(max-width: 768px) 31vw, 250px"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                        style={{ imageRendering: 'auto' }}
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />

                                    {/* Unified Badges (Bottom Right) */}
                                    <div className="absolute bottom-1 right-1 z-20 pointer-events-none flex flex-col items-end gap-0.5 max-w-[90%]">
                                        {movieBadges.map((b, idx) => (
                                            <div 
                                                key={idx} 
                                                className={`text-[6.5px] font-bold px-1 py-0.5 rounded-[2px] border shadow-sm transition-colors md:backdrop-blur-md ${b.classes}`}
                                            >
                                                {b.display}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Hover Play */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/50 transform group-hover:scale-110 transition-transform">
                                            <Play className="w-5 h-5 fill-current ml-0.5" />
                                        </div>
                                    </div>
                                </div>

                                 {/* Title Below Image */}
                                <div className="p-1.5 pt-1 bg-surface-900/40">
                                    <div className="truncate">
                                        <h3 className="text-[10.5px] font-medium text-white group-hover:text-primary transition-colors leading-tight truncate">{movie.name}</h3>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className="text-[9px] text-gray-500 truncate max-w-[75%] font-normal italic opacity-80">
                                            {movie.origin_name}
                                        </p>
                                        <span className="text-[9px] text-gray-400 font-normal shrink-0">
                                            {movie.year}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
