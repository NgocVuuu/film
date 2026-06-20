'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    year: number;
    poster_url?: string;
    view?: number;
    quality?: string;
    lang?: string;
    episode_current?: string;
    hasVip?: boolean;
}

interface TrendingCarouselProps {
    movies: Movie[];
    title?: string;
}

export function TrendingCarousel({ movies, title = "Xếp Hạng Nổi Bật" }: TrendingCarouselProps) {
    if (!movies || movies.length === 0) return null;

    const getQualityLabel = (quality?: string) => {
        const q = quality?.toLowerCase() || '';
        if (q.includes('4k') || q.includes('2160')) return '4K';
        if (q.includes('fhd') || q.includes('1080')) return 'FHD';
        if (q.includes('hd') || q.includes('720')) return 'HD';
        if (q.includes('sd') || q.includes('480')) return 'SD';
        if (q.includes('cam')) return 'CAM';
        return null;
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

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gold-gradient" style={{ textShadow: "0 0 20px rgba(234,179,8,0.3)" }}>
                    {title}
                </h2>
            </div>

            <Carousel
                opts={{
                    align: 'start',
                    loop: true,
                    dragFree: true,
                    skipSnaps: false,
                    containScroll: 'trimSnaps',
                }}
                plugins={[
                    Autoplay({
                        delay: 3500,
                        stopOnInteraction: true,
                        stopOnMouseEnter: true,
                    }),
                ]}
                className="w-full relative group/trending"
            >
                <CarouselContent className="-ml-4">
                    {movies.map((movie, index) => {
                        const movieBadges = getBadges(movie.quality, movie.episode_current, movie.lang);
                        const qualityLabel = movieBadges.length > 0 ? getQualityLabel(movie.quality) : null;
                        return (
                            <CarouselItem key={movie._id} className="pl-4 basis-[48%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                                <Link href={`/movie/${movie.slug}`} className="block group transition-all duration-300">
                                    {/* Skewed Poster Card */}
                                    <div 
                                        className="relative w-full aspect-[2/3] border-2 border-yellow-500/50 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-[1.03] -skew-x-6 rounded-2xl md:rounded-3xl bg-black overflow-hidden"
                                        style={{ 
                                            willChange: 'transform',
                                            backfaceVisibility: 'hidden'
                                        }}
                                    >
                                        <Image
                                            src={movie.poster_url || movie.thumb_url}
                                            alt={movie.name}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                            className="object-cover object-center transition-transform duration-500 group-hover:scale-110 scale-[1.15] skew-x-6"
                                            loading="lazy"
                                            style={{ imageRendering: 'auto' }}
                                        />

                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-60" />

                                        {/* Rank Number */}
                                        <div className="absolute top-0 right-0 p-2 z-20 skew-x-6">
                                            <span
                                                className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)] opacity-80 select-none italic"
                                                style={{ WebkitTextStroke: '0.5px rgba(255,255,255,0.3)' }}
                                            >
                                                #{index + 1}
                                            </span>
                                        </div>

                                        {/* Quality Badge (Top Left) */}
                                        <div className="absolute top-2 left-2 z-20 skew-x-6 pointer-events-none flex gap-1">
                                            {qualityLabel && (
                                                <div className="md:backdrop-blur-md text-center text-[6.5px] font-bold px-1.5 py-0.5 rounded-[2px] border shadow-sm bg-stone-900/85 text-amber-400 border-stone-600/60 flex justify-center items-center tracking-wide">
                                                    {qualityLabel}
                                                </div>
                                            )}
                                            {movie.hasVip && (
                                                <div className="md:backdrop-blur-md text-center text-[6.5px] font-bold px-1.5 py-0.5 rounded-[2px] border shadow-sm bg-pink-900/85 text-pink-300 border-pink-500/50 flex justify-center items-center tracking-wider shadow-pink-500/20">
                                                    VIP
                                                </div>
                                            )}
                                        </div>

                                        {/* Unified Badges (Bottom Right) - Inside Poster */}
                                        <div className="absolute bottom-3 right-4 z-20 skew-x-6 pointer-events-none flex flex-col items-end gap-0.5 max-w-[80%]">
                                            {movieBadges.map((b, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`text-center w-[48px] text-[6.5px] font-bold px-1 py-0.5 rounded-[2px] border shadow-sm transition-colors flex justify-center items-center md:backdrop-blur-md ${b.classes}`}
                                                >
                                                    {b.display}
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="w-10 h-10 rounded-full bg-primary/90 text-black flex items-center justify-center shadow-lg shadow-primary/50 skew-x-6 transform group-hover:scale-110 transition-transform">
                                                <Play fill="currentColor" className="ml-1 w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Below Poster */}
                                    <div className="mt-2 px-1">
                                        <h3 className="text-[11px] font-medium text-white group-hover:text-primary transition-colors leading-tight truncate">
                                            {movie.name}
                                        </h3>
                                        <div className="flex items-center justify-between mt-0.5 text-[9px] text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <span className="italic opacity-70">{movie.origin_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-primary font-bold opacity-80">{(movie.view || 0).toLocaleString()} view</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>
                <CarouselPrevious className="left-0 opacity-0 group-hover/trending:opacity-100 transition-opacity hidden md:flex bg-black/50 border-white/10 hover:bg-primary hover:text-black" />
                <CarouselNext className="right-0 opacity-0 group-hover/trending:opacity-100 transition-opacity hidden md:flex bg-black/50 border-white/10 hover:bg-primary hover:text-black" />
            </Carousel>
        </div>
    );
}
