import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
    threshold?: number;
    rootMargin?: string;
}

/**
 * Hook to detect when an element enters the viewport
 * Used for lazy loading content on scroll
 */
export function useInView(options: UseInViewOptions = {}) {
    const { threshold = 0.1, rootMargin = '200px' } = options;
    const [isInView, setIsInView] = useState(false);
    const [hasBeenInView, setHasBeenInView] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // If already been in view, don't need to observe anymore
        if (hasBeenInView) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    setHasBeenInView(true);
                } else {
                    setIsInView(false);
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [threshold, rootMargin, hasBeenInView]);

    return { ref, isInView, hasBeenInView };
}
