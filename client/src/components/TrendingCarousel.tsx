'use client';

import { useState, useRef, useEffect } from 'react';
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
    progress?: {
        currentTime: number;
        duration: number;
        percentage: number;
        episodeSlug: string;
        episodeName: string;
    };
}

interface TrendingCarouselProps {
    movies: Movie[];
}

export function TrendingCarousel({ movies }: TrendingCarouselProps) {
    if (!movies || movies.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gold-gradient" style={{ textShadow: "0 0 20px rgba(234,179,8,0.3)" }}>
                    Xếp Hạng Nổi Bật
                </h2>
            </div>

            <Carousel
                opts={{
                    align: 'start',
                    loop: true,
                }}
                plugins={[
                    Autoplay({
                        delay: 3500,
                    }),
                ]}
                className="w-full relative group"
            >
                <CarouselContent className="-ml-4">
                    {movies.map((movie, index) => (
                        <CarouselItem key={movie._id} className="pl-4 basis-[65%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                            <Link href={`/movie/${movie.slug}`} className="block relative w-full aspect-[2/3] overflow-hidden group/item border-2 border-yellow-500/80 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.6)] hover:scale-[1.02] hover:-translate-y-1 -skew-x-6 rounded-2xl md:rounded-3xl transform bg-black">
                                <div className="absolute inset-0 border-[1px] border-white/10 z-10 pointer-events-none rounded-2xl md:rounded-3xl"></div>

                                <img
                                    src={movie.poster_url || movie.thumb_url}
                                    alt={movie.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-125 scale-[1.15] skew-x-6"
                                />

                                {/* Gradient Overlay */}
                                <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/80 to-transparent opacity-90 group-hover/item:opacity-95 transition-opacity skew-x-6 -ml-4 w-[120%]" />

                                {/* Rank Number */}
                                <div className="absolute top-0 right-0 p-2 z-20 skew-x-6">
                                    <span
                                        className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)] opacity-80 group-hover/item:opacity-100 transition-opacity select-none italic"
                                        style={{
                                            WebkitTextStroke: '1px rgba(255,255,255,0.5)',
                                            filter: 'drop-shadow(0 0 5px rgba(234,179,8,0.3))'
                                        }}
                                    >
                                        #{index + 1}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="absolute inset-x-0 bottom-0 p-4 z-20 translate-y-2 group-hover/item:translate-y-0 transition-transform duration-300 skew-x-6">
                                    {/* Progress Bar (if any) */}
                                    {movie.progress && movie.progress.percentage > 0 && (
                                        <div className="w-full h-1 bg-white/20 rounded-full mb-3 overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${Math.min(movie.progress.percentage, 100)}%` }}
                                            />
                                        </div>
                                    )}

                                    <h3 className="text-lg font-bold text-white line-clamp-1 group-hover/item:text-primary transition-colors">
                                        {movie.name}
                                    </h3>
                                    <div className="flex items-center justify-between text-xs text-gray-300 mt-1">
                                        <span className="flex items-center gap-1">
                                            {movie.year}
                                        </span>
                                        <span className="text-gold-400 font-medium">
                                            {(movie.view || 0).toLocaleString()} views
                                        </span>
                                    </div>

                                    <div className="mt-3 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <Button size="sm" className="w-full bg-white/10 hover:bg-primary hover:text-black backdrop-blur-sm border border-white/10 rounded-full text-xs font-bold gap-2">
                                            <Play fill="currentColor" className="w-3 h-3" />
                                            XEM NGAY
                                        </Button>
                                    </div>
                                </div>
                            </Link>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="left-0 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex bg-black/50 border-white/10 hover:bg-primary hover:text-black" />
                <CarouselNext className="right-0 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex bg-black/50 border-white/10 hover:bg-primary hover:text-black" />
            </Carousel>
        </div>
    );
}
