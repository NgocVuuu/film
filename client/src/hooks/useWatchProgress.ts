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
        if (!user || !movieSlug || !episodeSlug || !serverName || currentTime < 5) return;

        try {
            await fetch(`${API_URL}/api/progress/save`, {
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
        } catch (error) {
            console.error('Error saving progress:', error);
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
