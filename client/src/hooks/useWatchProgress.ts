import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { API_URL } from '@/lib/config';

interface WatchProgressProps {
    movieSlug?: string;
    movieName?: string;
    movieThumb?: string;
    episodeSlug?: string;
    episodeName?: string;
    serverName?: string;
}

export function useWatchProgress({
    movieSlug,
    movieName,
    movieThumb,
    episodeSlug,
    episodeName,
    serverName
}: WatchProgressProps) {
    const { user } = useAuth();
    const [initialProgress, setInitialProgress] = useState<number | null>(null);
    const [progressLoaded, setProgressLoaded] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load initial progress from server
    useEffect(() => {
        if (!user || !movieSlug || !episodeSlug || progressLoaded) return;

        const loadProgress = async () => {
            try {
                const response = await fetch(`${API_URL}/api/progress/movie/${movieSlug}`, {
                    headers: {
                        // Cookie sent automatically
                    },
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data.length > 0) {
                        // Find progress for this specific episode
                        const progress = data.data.find((p: any) => p.episodeSlug === episodeSlug);
                        if (progress && progress.currentTime > 10) { // Only restore if > 10s
                            setInitialProgress(progress.currentTime);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading progress:', error);
            } finally {
                setProgressLoaded(true);
            }
        };

        loadProgress();
    }, [user, movieSlug, episodeSlug, progressLoaded]);

    // Save progress function
    const saveProgress = async (currentTime: number, duration: number) => {
        if (!movieSlug || !episodeSlug || currentTime < 5) return;

        // 1. Save to LocalStorage for History Page (Immediate UI update)
        try {
            const history = JSON.parse(localStorage.getItem('history') || '[]');
            const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

            // Allow update if movie exists in history
            const existingIndex = history.findIndex((h: any) => h.slug === movieSlug);

            if (existingIndex !== -1) {
                // Update existing
                history[existingIndex] = {
                    ...history[existingIndex],
                    progress: {
                        currentTime,
                        duration,
                        percentage,
                        episodeSlug,
                        episodeName: episodeName || '',
                    },
                    viewedAt: new Date().toISOString()
                };

                // Move to top
                const item = history.splice(existingIndex, 1)[0];
                history.unshift(item);

                localStorage.setItem('history', JSON.stringify(history));
            } else {
                // If not in history (e.g. direct link), maybe add it? 
                // For now, let's assume MovieDetail added it. 
                // If we want to be robust, we could add a basic entry here, but we might lack thumb/name if props aren't full.
                // Given VideoPlayerProps has movieName/Thumb, we can add it!
                if (movieName) {
                    const newItem = {
                        _id: movieSlug, // fallback id
                        name: movieName,
                        origin_name: '',
                        slug: movieSlug,
                        thumb_url: movieThumb || '',
                        year: new Date().getFullYear(),
                        viewedAt: new Date().toISOString(),
                        progress: {
                            currentTime,
                            duration,
                            percentage,
                            episodeSlug,
                            episodeName: episodeName || '',
                        }
                    };
                    history.unshift(newItem);
                    localStorage.setItem('history', JSON.stringify(history.slice(0, 50)));
                }
            }
        } catch (e) {
            console.error('Error saving local history:', e);
        }

        // 2. Save to API (if user logged in)
        if (user && serverName) {
            try {
                const response = await fetch(`${API_URL}/api/progress/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        movieSlug,
                        movieName,
                        movieThumb,
                        episodeSlug,
                        episodeName,
                        serverName,
                        currentTime,
                        duration
                    })
                });

                const data = await response.json();
                console.log('[saveProgress] API Response:', { status: response.status, data });

                if (!response.ok) {
                    console.error('[saveProgress] API Error:', data);
                }
            } catch (error) {
                console.error('[saveProgress] Network error:', error);
            }
        }
    };

    // Debounced save - saves after user stops seeking for 2 seconds
    const debouncedSave = (currentTime: number, duration: number) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            saveProgress(currentTime, duration);
        }, 2000);
    };

    return {
        initialProgress,
        saveProgress,
        debouncedSave
    };
}
