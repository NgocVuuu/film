'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

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
    progress?: {
        currentTime: number;
        duration: number;
        percentage: number;
        episodeSlug: string;
        episodeName: string;
    };
}

interface HeroSliderProps {
    movies: Movie[];
}

export function HeroSlider({ movies }: HeroSliderProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // Use refs for touch coordinates to avoid re-renders during swipe
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        touchEndX.current = null;
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;

        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }
    };

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        touchStartX.current = e.clientX;
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        touchEndX.current = e.clientX;
    };

    const onMouseUp = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        const endX = e.clientX;

        if (!touchStartX.current) return;

        const distance = touchStartX.current - endX;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }

        touchStartX.current = null;
        touchEndX.current = null;
    };

    const onMouseLeave = () => {
        if (isDragging) setIsDragging(false);
    };

    // Auto-play
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % movies.length);
        }, 6000); // 6 seconds per slide
        return () => clearInterval(timer);
    }, [movies.length]);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % movies.length);
    };

    if (!movies || movies.length === 0) return null;

    const currentMovie = movies[currentIndex];

    return (
        <div
            className="relative w-full h-[85vh] md:h-screen -mt-14 md:-mt-16 group overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
        >
            {/* Background Slider */}
            {movies.map((movie, index) => (
                <div
                    key={movie._id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                        }`}
                >
                    <Image
                        src={movie.poster_url || movie.thumb_url}
                        alt={movie.name}
                        className="w-full h-full object-cover object-center opacity-90"
                        fill
                        sizes="100vw"
                        priority={index === 0}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#050505] via-[#050505]/20 to-transparent"></div>
                    <div className="absolute inset-0 bg-linear-to-r from-[#050505]/80 via-[#050505]/30 to-transparent"></div>

                    {/* Progress Bar for Hero */}
                    {movie.progress && movie.progress.percentage > 0 && (
                        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-700/30 z-20">
                            <div
                                className="h-full bg-primary shadow-[0_0_15px_rgba(234,179,8,0.8)]"
                                style={{ width: `${Math.min(movie.progress.percentage, 100)}%` }}
                            />
                        </div>
                    )}
                </div>
            ))}

            {/* Content */}
            <div className="absolute inset-0 z-20 container mx-auto px-4 flex flex-col justify-center pt-24 md:pt-40 pb-12 md:pb-32">
                <div className="max-w-2xl space-y-4 md:space-y-6 animate-fade-in-up">
                    <span className="text-gold-500 font-bold tracking-widest text-xs md:text-sm uppercase border border-gold-500/50 px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-black/40 backdrop-blur-md shadow-glow inline-block">
                        #{currentIndex + 1} Phim Nổi Bật
                    </span>

                    <h1 className="text-xl md:text-3xl lg:text-5xl font-black leading-tight text-white drop-shadow-2xl font-heading line-clamp-2">
                        {currentMovie.name}
                    </h1>

                    <p className="text-lg md:text-2xl text-gray-200 font-light tracking-wide flex items-center gap-3">
                        {currentMovie.origin_name}
                        <span className="text-primary font-bold text-base md:text-xl">({currentMovie.year})</span>
                        {currentMovie.episode_current && (
                            <span className="text-gold-400 font-bold text-sm md:text-lg border border-gold-500/30 px-3 py-1 rounded-lg whitespace-nowrap bg-black/40 backdrop-blur-sm shadow-sm">
                                {currentMovie.episode_current}
                            </span>
                        )}
                    </p>

                    <div className="flex flex-wrap gap-3 pt-4">
                        <Link href={`/movie/${currentMovie.slug}`}>
                            <Button size="lg" className="bg-primary text-black hover:bg-gold-400 font-bold text-base md:text-lg px-6 md:px-8 py-6 rounded-full shadow-lg shadow-primary/30 flex items-center gap-2 transform hover:scale-105 transition-all duration-300">
                                <Play fill="black" className="w-5 h-5" />
                                XEM NGAY
                            </Button>
                        </Link>
                        <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 text-base md:text-lg px-6 md:px-8 py-6 rounded-full backdrop-blur-sm flex items-center gap-2 transition-all">
                            <Info className="w-5 h-5" />
                            Chi Tiết
                        </Button>
                    </div>
                </div>
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 bg-black/20 hover:bg-primary text-white hover:text-black rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            >
                <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 bg-black/20 hover:bg-primary text-white hover:text-black rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            >
                <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-18 md:bottom-20 right-8 md:right-12 z-30 flex gap-2">
                {movies.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 md:w-8 bg-primary' : 'w-1.5 md:w-2 bg-white/30 hover:bg-white/50'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
