'use client';
import { useState, useEffect, useRef, useMemo, memo } from 'react';
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
    content?: string; // short description
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

const BackgroundSlide = memo(({ movie }: { movie: Movie }) => (
    <div
        className="absolute inset-0 will-change-opacity z-0"
        style={{
            opacity: 0,
            visibility: 'hidden',
        }}
    >
        <Image
            src={movie.poster_url || movie.thumb_url}
            alt={movie.name}
            className="w-full h-full object-cover object-top md:hidden"
            fill
            sizes="100vw"
            style={{ filter: 'blur(4px) brightness(0.7)' }} // Added subtle blur back for better depth balance
        />
        <Image
            src={movie.thumb_url}
            alt={movie.name}
            className="w-full h-full object-cover object-center hidden md:block"
            fill
            sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
        {/* On tablet, create a stronger bottom gradient to host the text. On desktop, create a horizontal gradient */}
        <div className="absolute inset-y-0 left-0 w-full lg:w-2/3 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent hidden md:block"></div>
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent hidden md:block lg:hidden"></div>

        {movie.progress && movie.progress.percentage > 0 && (
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-700/30 z-20">
                <div
                    className="h-full bg-primary shadow-[0_0_15px_rgba(234,179,8,0.8)]"
                    style={{ width: `${Math.min(movie.progress.percentage, 100)}%` }}
                />
            </div>
        )}
    </div>
));
BackgroundSlide.displayName = 'BackgroundSlide';

export function HeroSlider({ movies }: HeroSliderProps) {
    const SLOT_PX = 250; // Increased spacing to ultra-wide (was 210)
    const moviesCount = movies.length;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isJumping, setIsJumping] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const jumpTimerRef = useRef<NodeJS.Timeout | null>(null);
    const rafRef = useRef<number | null>(null);
    const dragOffsetRef = useRef(0);
    const currentIndexRef = useRef(0);
    const isDraggingRef = useRef(false);

    // DOM Refs for high-performance direct manipulation
    const posterRefs = useRef<(HTMLDivElement | null)[]>([]);
    const backgroundRefs = useRef<(HTMLDivElement | null)[]>([]);
    const mobileTextRef = useRef<HTMLDivElement>(null);
    const mobileDescRef = useRef<HTMLDivElement>(null);
    const desktopTextRef = useRef<HTMLDivElement>(null);
    const slidesContainerRef = useRef<HTMLDivElement>(null);
    const contentWrapperRef = useRef<HTMLDivElement>(null);

    // Movies ref to access current data in raf loop
    const moviesRef = useRef(movies);
    useEffect(() => {
        moviesRef.current = movies;
    }, [movies]);

    // Use refs for touch coordinates to avoid re-renders during swipe
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const isHorizontalRef = useRef<boolean | null>(null);
    const touchStartTime = useRef<number>(0);

    const updatePosterStyles = (offset: number) => {
        dragOffsetRef.current = offset;
        const moviesCount = moviesRef.current.length;
        if (moviesCount === 0) return;
        if (!slidesContainerRef.current) return;

        // Content Wrapper opacity fade stays (only for text)
        const textOpacity = Math.max(0, 1 - (Math.abs(offset) / 400)).toString();
        if (mobileTextRef.current) mobileTextRef.current.style.opacity = textOpacity;
        if (mobileDescRef.current) mobileDescRef.current.style.opacity = textOpacity;
        if (desktopTextRef.current) desktopTextRef.current.style.opacity = textOpacity;

        const fullTrackWidth = moviesCount * SLOT_PX;
        const halfTrack = fullTrackWidth / 2;
        const viewportWidth = sliderRef.current?.offsetWidth || 500;
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const cullingDist = isMobile ? viewportWidth * 2 : viewportWidth;
        const isDragging = isDraggingRef.current;

        // Content Wrapper imperative transition control
        if (contentWrapperRef.current) {
            contentWrapperRef.current.style.transition = isDragging ? 'none' : (isJumping ? 'all 300ms ease-out' : 'all 700ms cubic-bezier(0.16, 1, 0.3, 1)');
        }

        // 1. Process Posters
        moviesRef.current.forEach((_, i) => {
            const ref = posterRefs.current[i];
            if (!ref) return;

            // Raw position relative to the "current" center
            let rawP = (i - currentIndexRef.current) * SLOT_PX + offset;
            
            // Seamless Looping Wrap:
            // Standardize into [-halfTrack, halfTrack]
            let wrappedP = ((rawP + halfTrack) % fullTrackWidth + fullTrackWidth) % fullTrackWidth - halfTrack;

            const dist = Math.abs(wrappedP);
            
            // Visibility Culling for performance - increased for mobile to prevent disappearing on fast flicks
            if (dist > cullingDist) {
                ref.style.visibility = 'hidden';
                return;
            }
            ref.style.visibility = 'visible';

            // Enhanced Continuous Scaling & Rotation
            const progress = Math.pow(Math.max(0, 1 - dist / (SLOT_PX * 2.5)), 1.5);
            
            // --- Interactive Scaling Refinement ---
            // On mobile, shrink posters by 10% while dragging to provide tactile feedback
            const dragScaleMultiplier = (isMobile && isDragging) ? 0.9 : 1.0;
            const scale = (1 + progress * 0.25) * dragScaleMultiplier; 
            
            // Refined Rotation: Use a Sin curve to cap max rotation and keep it natural
            const rotate = Math.sin(wrappedP / (SLOT_PX * 2)) * 22; 
            
            // Imperative Style Orchestration:
            // 1. Transition: None during dragging (instant feedback), Smooth during snapping (GPU accelerated)
            ref.style.transition = isDragging ? 'none' : 'all 700ms cubic-bezier(0.16, 1, 0.3, 1)';
            
            // 2. Transform & Depth
            ref.style.transform = `translate3d(-50%, -50%, 0) translateX(${wrappedP}px) rotate(${rotate}deg) scale(${scale})`;
            ref.style.zIndex = Math.round(100 - dist / 5).toString();
            
            // 3. 3D Opacity Fade
            ref.style.opacity = Math.max(0.4, progress).toString();
        });

        // 2. Process Background Slides (Imperative sync)
        const children = slidesContainerRef.current.children;
        const globalProgress = -offset / SLOT_PX;
        
        for (let i = 0; i < moviesCount; i++) {
            const slide = children[i] as HTMLElement;
            if (!slide) continue;

            let diff = i - currentIndexRef.current;
            if (diff > moviesCount / 2) diff -= moviesCount;
            if (diff < -moviesCount / 2) diff += moviesCount;
            
            const distance = Math.abs(globalProgress - diff);
            const opacity = Math.pow(Math.max(0, 1 - distance), 2); // Sharper transition
            
            slide.style.transition = isDraggingRef.current ? 'none' : 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1)';
            slide.style.opacity = opacity.toString();
            slide.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
        }
    };

    const onTouchStart = (e: React.TouchEvent) => {
        const touch = e.targetTouches[0];
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        isHorizontalRef.current = null;
        touchStartTime.current = Date.now();
        dragOffsetRef.current = 0;
        isDraggingRef.current = true;
        // Skip React state update for zero-render start
    };

    const nativeTouchMove = (e: TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        
        const touch = e.targetTouches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        const diffX = currentX - touchStartX.current;
        const diffY = currentY - touchStartY.current;

        const THRESHOLD = 3; // Lowered for faster response (was 5)
        // Direction Locking: Determine if the gesture is horizontal or vertical
        if (isHorizontalRef.current === null) {
            if (Math.abs(diffX) > THRESHOLD || Math.abs(diffY) > THRESHOLD) {
                isHorizontalRef.current = Math.abs(diffX) > Math.abs(diffY);
            }
        }

        if (isHorizontalRef.current === false) {
            // Explicitly Vertical: Allow native scroll, stop slider tracking
            isDraggingRef.current = false;
            setIsDragging(false);
            return;
        }

        if (isHorizontalRef.current === true) {
            // Explicitly Horizontal: Intercept for slider control
            if (e.cancelable) e.preventDefault();
            
            // Subtract threshold from diffX to eliminate the visual jump when locking starts
            const jumpAdjustedDiff = diffX - (Math.sign(diffX) * THRESHOLD);

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                updatePosterStyles(jumpAdjustedDiff);
            });
        }
    };

    const onTouchEnd = () => {
        if (touchStartX.current === null) return;
        handleDragEnd();
    };

    const onMouseDown = (e: React.MouseEvent) => {
        // We removed e.preventDefault() to allow button clicks inside the slider to work
        isDraggingRef.current = true;
        touchStartX.current = e.clientX;
        touchStartTime.current = Date.now();
        dragOffsetRef.current = 0;
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current || touchStartX.current === null) return;
        const currentX = e.clientX;
        const diff = currentX - touchStartX.current;
        
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            updatePosterStyles(diff);
        });
    };

    const onMouseUp = () => {
        if (isDraggingRef.current) handleDragEnd();
    };

    const onMouseLeave = () => {
        if (isDraggingRef.current) handleDragEnd();
    };

    const handleDragEnd = (velocityX?: number) => {
        if (!isDraggingRef.current) return;
        
        const offset = dragOffsetRef.current;
        const threshold = SLOT_PX / 3;
        let snapOffset = 0;

        // Use window.innerWidth for device detection
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        
        // velocityX is passed from touch events, velocity is calculated from mouse events
        const v = velocityX !== undefined ? velocityX : (offset / Math.max(Date.now() - touchStartTime.current, 1));

        if (isMobile) {
            // Adaptive kinetic drift for mobile - increased momentum (was 250)
            const drift = v * 400; 
            const totalOffset = offset + drift;
            snapOffset = Math.round(totalOffset / SLOT_PX) * SLOT_PX;
        } else {
            // Limited momentum for desktop (max 1 slide jump)
            // Velocity-sensitive snapping for desktop/general
            // Lowered velocity threshold from 0.5 to 0.35 for higher sensitivity
            if (offset > threshold || v > 0.35) {
                snapOffset = SLOT_PX;
            } else if (offset < -threshold || v < -0.35) {
                snapOffset = -SLOT_PX;
            } else {
                snapOffset = 0;
            }
        }

        const jumps = -snapOffset / SLOT_PX;
        let nextIndex = (currentIndexRef.current + jumps + moviesCount) % moviesCount;

        // Cleanup dragging state IMMEDIATELY
        isDraggingRef.current = false;
        setIsDragging(false);
        touchStartX.current = null;
        
        // --- GPU ACCELERATION TRIGGER ---
        // 1. Update state indices
        setCurrentIndex(nextIndex);
        currentIndexRef.current = nextIndex;
        
        // 2. Clear drag offset
        dragOffsetRef.current = 0;
        setDragOffset(0);

        // 3. Final visual sync - Browser will transition from current 'offset' transform 
        // to '0' transform using the CSS transition we set in updatePosterStyles
        requestAnimationFrame(() => {
            updatePosterStyles(0);
        });
    };

    // Auto-play (Disabled on mobile)
    useEffect(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        if (isMobile) return;

        const timer = setInterval(() => {
            if (isDraggingRef.current) return;
            const next = (currentIndexRef.current + 1) % moviesRef.current.length;
            currentIndexRef.current = next;
            setCurrentIndex(next);
        }, 6000); // 6 seconds per slide
        return () => clearInterval(timer);
    }, [movies.length]);

    // Sync DOM with state on mount or change
    useEffect(() => {
        currentIndexRef.current = currentIndex;
        updatePosterStyles(0);
    }, [currentIndex, movies.length]);

    // Native Touch Event Handling to bypass "passive" issues
    useEffect(() => {
        const slider = sliderRef.current;
        if (!slider) return;

        const options = { passive: false } as AddEventListenerOptions;
        slider.addEventListener('touchmove', nativeTouchMove, options);
        
        return () => {
            slider.removeEventListener('touchmove', nativeTouchMove);
        };
    }, []);



    const handlePrev = (step: number = 1) => {
        if (step <= 0) {
            setIsJumping(false);
            return;
        }

        if (step > 1) {
            setIsJumping(true);
            const next = (currentIndexRef.current - 1 + movies.length) % movies.length;
            currentIndexRef.current = next;
            setCurrentIndex(next);
            jumpTimerRef.current = setTimeout(() => handlePrev(step - 1), 300);
        } else {
            // Last or single step: GPU-accelerated sync
            const next = (currentIndexRef.current - 1 + movies.length) % movies.length;
            currentIndexRef.current = next;
            setCurrentIndex(next);
            setDragOffset(0);
            dragOffsetRef.current = 0;
            
            requestAnimationFrame(() => {
                updatePosterStyles(0);
            });

            if (isJumping) {
                jumpTimerRef.current = setTimeout(() => setIsJumping(false), 300);
            }
        }
    };

    const handleNext = (step: number = 1) => {
        if (step <= 0) {
            setIsJumping(false);
            return;
        }

        if (step > 1) {
            setIsJumping(true);
            const next = (currentIndexRef.current + 1) % movies.length;
            currentIndexRef.current = next;
            setCurrentIndex(next);
            jumpTimerRef.current = setTimeout(() => handleNext(step - 1), 300);
        } else {
            // Last or single step: GPU-accelerated sync
            const next = (currentIndexRef.current + 1) % movies.length;
            currentIndexRef.current = next;
            setCurrentIndex(next);
            setDragOffset(0);
            dragOffsetRef.current = 0;

            requestAnimationFrame(() => {
                updatePosterStyles(0);
            });

            if (isJumping) {
                jumpTimerRef.current = setTimeout(() => setIsJumping(false), 300);
            }
        }
    };

    // Cleanup timers
    useEffect(() => {
        return () => {
            if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
        };
    }, []);

    if (!movies || movies.length === 0) return null;

    const currentMovie = movies[currentIndex];

    return (
        <div
            ref={sliderRef}
            className="relative w-full h-auto md:h-screen -mt-[calc(3.5rem+env(safe-area-inset-top))] md:-mt-16 group overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing touch-pan-y"
            style={{ overscrollBehaviorX: 'none' }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
        >
            <div ref={slidesContainerRef} className="absolute inset-0">
                {movies.map((movie, index) => (
                    <BackgroundSlide 
                        key={movie._id}
                        movie={movie}
                        // No reactive props here to avoid fighting with imperative styles
                    />
                ))}
            </div>

            {/* Content */}
            {/* Mobile layout: poster overlay, info below, centered, with short description */}
            <div 
                ref={contentWrapperRef}
                className="relative md:absolute md:inset-0 z-20 container mx-auto px-6 lg:px-12 flex flex-col justify-start md:justify-end lg:justify-center pt-28 md:pt-0 pb-12 md:pb-[160px] lg:pb-0"
                style={{
                    opacity: 1,
                    willChange: 'opacity'
                }}
            >
                {/* Mobile: poster overlay */}
                <div 
                    className="flex flex-col items-center md:hidden animate-fade-in-up px-4"
                >
                    {/* The Full Static Poster Track - OUTSIDE text ref to fix 1s blur */}
                    <div 
                        className="relative w-40 h-60 mb-5 flex items-center justify-center"
                        style={{
                            transition: isDragging ? 'none' : (isJumping ? 'all 300ms ease-out' : 'all 700ms cubic-bezier(0.16, 1, 0.3, 1)')
                        }}
                    >
                        {movies.map((movie, idx) => (
                            <div 
                                key={movie._id}
                                ref={el => { posterRefs.current[idx] = el; }}
                                className="absolute" 
                                style={{ 
                                    width: '140px', 
                                    height: '210px',
                                    left: '50%',
                                    top: '50%',
                                    willChange: 'transform, opacity',
                                    // NO reactive transform/opacity/transition here to prevent React flicker
                                }}
                            >
                                <Link href={`/movie/${movie.slug}`} className="block w-full h-full">
                                    <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-xl ${idx === currentIndex ? 'border-2 border-yellow-300/60 shadow-yellow-200/20' : 'bg-gray-900/50'}`}>
                                        <img
                                            src={movie.poster_url || movie.thumb_url}
                                            alt={movie.name}
                                            className="w-full h-full object-cover object-top rounded-2xl transition-transform duration-500 hover:scale-105"
                                            draggable={false}
                                            onDragStart={(e) => e.preventDefault()}
                                        />
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                    
                    {/* Text Section - Fading portion (Title/Tags) */}
                    <div 
                        ref={mobileTextRef}
                        className="flex flex-col items-center w-full"
                    >
                        <h1
                            className="font-extrabold leading-tight font-heading text-center text-balance bg-linear-to-b from-yellow-100 via-yellow-300 to-yellow-500 bg-clip-text text-transparent mb-2 drop-shadow-[0_2px_8px_rgba(234,179,8,0.25)] line-clamp-1 overflow-hidden text-ellipsis max-w-[80%] mx-auto px-0 text-[1.8rem]"
                        >
                            {currentMovie.name}
                        </h1>
                        <div className="w-full flex justify-center">
                            <p className="text-xs text-gray-300 font-normal tracking-wide flex items-center gap-2 justify-center mb-1 max-w-full overflow-hidden whitespace-nowrap text-ellipsis text-center">
                                {currentMovie.origin_name}
                                <span className="text-primary font-bold">({currentMovie.year})</span>
                                {currentMovie.episode_current && (
                                    <span className="text-gold-400 font-bold text-xs border border-gold-500/30 px-2 py-0.5 rounded-lg whitespace-nowrap bg-black/40 backdrop-blur-sm shadow-sm">
                                        {currentMovie.episode_current}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Static Action Buttons - Do not fade on swipe */}
                    <div className="flex flex-wrap gap-4 justify-center pt-1 mb-4 z-30">
                        <Link href={`/movie/${currentMovie.slug}/watch`}>
                            <Button size="sm" className="bg-gold-gradient text-black hover:brightness-110 font-bold text-sm px-4 py-2 rounded-lg shadow-glow flex items-center gap-2 transform active:scale-95 transition-all duration-300 min-w-28 border-none">
                                <Play fill="black" className="w-4 h-4" />
                                XEM NGAY
                            </Button>
                        </Link>
                        <Link href={`/movie/${currentMovie.slug}`}>
                            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 text-sm px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2 transition-all min-w-24">
                                <Info className="w-4 h-4" />
                                Chi Tiết
                            </Button>
                        </Link>
                    </div>

                    {/* Fading Description Section */}
                    <div 
                        ref={mobileDescRef}
                        className="text-xs text-gray-300 text-center font-normal mb-1 px-4 py-1 bg-black/30 rounded-lg max-w-full"
                    >
                        <div className="line-clamp-2 overflow-hidden">
                            {currentMovie.content
                                ? currentMovie.content.replace(/<[^>]*>/g, '')
                                : 'Không có mô tả.'}
                        </div>
                    </div>
                    {/* Mobile dots moved here so they stay close to description */}
                    <div className="mt-3 md:hidden flex justify-center gap-1.5 z-30">
                        {movies.slice(0, 10).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1 rounded-full transition-all duration-300 ${
                                    idx === currentIndex ? 'w-5 bg-primary' : 'w-1.5 bg-white/30'
                                }`}
                            />
                        ))}
                    </div>
                </div>
                {/* Desktop: original layout */}
                <div 
                    ref={desktopTextRef}
                    className="w-full md:max-w-xl lg:max-w-3xl space-y-4 md:space-y-6 animate-fade-in-up hidden md:block"
                >
                    <span className="text-gold-500 font-bold tracking-widest text-xs md:text-sm uppercase border border-gold-500/50 px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-black/40 backdrop-blur-md shadow-[0_0_15px_rgba(234,179,8,0.2)] inline-block">
                        #{currentIndex + 1} Phim Nổi Bật
                    </span>
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight font-heading line-clamp-2 md:line-clamp-2 bg-gradient-to-b from-white via-amber-50 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                        {currentMovie.name}
                    </h1>
                    <p className="text-sm md:text-base text-gray-400 font-light tracking-wide flex items-center gap-3">
                        {currentMovie.origin_name}
                        <span className="text-primary font-bold text-xs md:text-sm">({currentMovie.year})</span>
                        {currentMovie.episode_current && (
                            <span className="text-gold-400 font-bold text-sm md:text-lg border border-gold-500/30 px-3 py-1 rounded-lg whitespace-nowrap bg-black/40 backdrop-blur-sm shadow-sm">
                                {currentMovie.episode_current}
                            </span>
                        )}
                    </p>
                    {/* Short description for desktop */}
                    {currentMovie.content && (
                        <div className="text-sm md:text-[15px] leading-relaxed text-gray-300 font-normal mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            <div className="line-clamp-3 md:line-clamp-3 overflow-hidden">
                                {currentMovie.content.replace(/<[^>]*>/g, '')}
                            </div>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3 pt-2">
                        <Link href={`/movie/${currentMovie.slug}/watch`}>
                            <Button size="lg" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-base md:text-lg px-6 md:px-8 py-6 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center gap-2 transform hover:scale-105 transition-all duration-300 border-none">
                                <Play fill="black" className="w-5 h-5" />
                                XEM NGAY
                            </Button>
                        </Link>
                        <Link href={`/movie/${currentMovie.slug}`}>
                            <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 text-base md:text-lg px-6 md:px-8 py-6 rounded-xl backdrop-blur-sm flex items-center gap-2 transition-all">
                                <Info className="w-5 h-5" />
                                Chi Tiết
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={() => handlePrev()}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 bg-black/20 hover:bg-primary text-white hover:text-black rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            >
                <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button
                onClick={() => handleNext()}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 bg-black/20 hover:bg-primary text-white hover:text-black rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            >
                <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>

            {/* Thumbnail Pagination — trending-style skewed mini cards, max 10, bottom right */}
            <div className="absolute bottom-4 md:bottom-8 right-3 md:right-8 z-30 hidden md:flex gap-2 lg:gap-3 items-end overflow-hidden max-w-[50vw] lg:max-w-[60vw]">
                {movies.slice(0, 10).map((movie, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`relative shrink-0 -skew-x-6 rounded-lg overflow-hidden focus:outline-none transition-all duration-300 bg-black ${
                                isActive ? 'scale-[1.08] -translate-y-2' : 'scale-100 hover:scale-[1.03] hover:-translate-y-1'
                            }`}
                            style={{
                                width: '72px',
                                height: '96px',
                                borderWidth: '2px',
                                borderStyle: 'solid',
                                borderColor: isActive ? '#eab308' : 'rgba(255,255,255,0.25)',
                                boxShadow: isActive ? '0 0 20px rgba(234,179,8,0.55)' : 'none',
                                opacity: isActive ? 1 : 0.78,
                            }}
                        >
                            {/* Counter-skewed image */}
                            <div className="absolute inset-0 skew-x-6 scale-[1.12]">
                                <Image
                                    src={movie.poster_url || movie.thumb_url}
                                    alt={movie.name}
                                    fill
                                    sizes="90px"
                                    className="object-cover object-top"
                                />
                            </div>
                            {/* Bottom gradient overlay */}
                            <div className="absolute bottom-0 left-0 h-10 bg-linear-to-t from-black/90 to-transparent skew-x-6 w-[140%] -ml-3 z-10" />
                            {/* Active yellow tint */}
                            {isActive && <div className="absolute inset-0 bg-yellow-500/10 skew-x-6 z-10" />}
                        </button>
                    );
                })}
            </div>

            {/* Mobile dots moved into mobile content so they stay close to the description */}
        </div>
    );
}
