'use client';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
}

interface MovieCarouselProps {
    title: string;
    movies: Movie[];
    icon?: React.ReactNode;
    viewAllLink?: string;
}

export function MovieCarousel({ title, movies, icon, viewAllLink }: MovieCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

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

    if (!movies || movies.length === 0) return null;

    return (
        <div className="py-8 space-y-4">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-yellow-200 flex items-center gap-3">
                    {icon && <span className="text-primary">{icon}</span>}
                    {title}
                </h2>
                {viewAllLink && (
                    <Link href={viewAllLink} className="text-sm text-gray-400 hover:text-primary transition-colors flex items-center gap-1 group">
                        Xem tất cả <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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

                {/* Carousel Container */}
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-4 px-4 pb-4 scrollbar-hide snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {movies.map((movie) => (
                        <Link
                            key={movie._id}
                            href={`/movie/${movie.slug}`}
                            className="bg-surface-800 rounded-lg overflow-hidden border border-border/50 shadow-lg relative snap-start w-[160px] md:w-[200px] flex-shrink-0 group hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 will-change-transform"
                        >
                            {/* Image */}
                            <div className="aspect-[2/3] w-full relative overflow-hidden">
                                <img
                                    src={movie.thumb_url}
                                    alt={movie.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                                {/* Badge */}
                                <div className="absolute top-2 left-2 bg-primary text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                    {movie.quality || 'HD'}
                                </div>

                                {/* Hover Play */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/50">
                                        <Play className="w-5 h-5 fill-current ml-0.5" />
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3">
                                <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{movie.name}</h3>
                                <p className="text-xs text-gray-400 truncate">{movie.origin_name}</p>
                                <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500 uppercase font-medium">
                                    <span>{movie.year}</span>
                                    <span className="border border-white/10 px-1 rounded">{movie.lang || 'Vietsub'}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
