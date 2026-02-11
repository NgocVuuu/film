'use client';
import { useInView } from '@/hooks/useInView';
import { MovieCarousel } from './MovieCarousel';

interface LazyMovieSectionProps {
    title: string;
    movies: any[];
    viewAllLink?: string;
}

/**
 * Lazy-loaded movie section that only renders when scrolled into view
 */
export function LazyMovieSection({ title, movies, viewAllLink }: LazyMovieSectionProps) {
    const { ref, hasBeenInView } = useInView({
        threshold: 0.05,
        rootMargin: '300px'  // Start loading 300px before entering viewport
    });

    return (
        <div ref={ref} className="min-h-[300px]">
            {hasBeenInView ? (
                <MovieCarousel title={title} movies={movies} viewAllLink={viewAllLink} />
            ) : (
                // Skeleton placeholder while not in view
                <div className="px-4">
                    <div className="h-6 w-48 bg-gray-800 animate-pulse rounded mb-6"></div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="aspect-[2/3] bg-gray-800 animate-pulse rounded-lg"></div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
