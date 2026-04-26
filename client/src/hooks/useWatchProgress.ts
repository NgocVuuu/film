import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { customFetch, getAuthToken } from '@/lib/api';
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
    const [loadedEpisode, setLoadedEpisode] = useState<string | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Store the latest time/duration so flush handlers can access it without stale closure
    const lastKnownRef = useRef<{ currentTime: number; duration: number } | null>(null);
    const lastSavedTimeRef = useRef<number>(0);

    // Nếu chuyển tập mới, phải reset thời gian xem cũ khẩn cấp bằng Render Phase
    if (loadedEpisode !== episodeSlug && initialProgress !== null) {
        setInitialProgress(null);
    }

    // Load initial progress from server
    useEffect(() => {
        if (!user || !movieSlug || !episodeSlug || loadedEpisode === episodeSlug) return;

        const loadProgress = async () => {
            try {
                const response = await customFetch(`/api/progress/movie/${movieSlug}`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data.length > 0) {
                        // Find progress for this specific episode
                        const progress = data.data.find((p: { episodeSlug?: string; currentTime?: number }) => p.episodeSlug === episodeSlug);
                        if (progress && progress.currentTime > 10) { // Only restore if > 10s
                            setInitialProgress(progress.currentTime);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading progress:', error);
            } finally {
                setLoadedEpisode(episodeSlug);
            }
        };

        loadProgress();
    }, [user, movieSlug, episodeSlug, loadedEpisode]);

    // Save progress function
    const saveProgress = async (currentTime: number, duration: number, isUnmounting = false) => {
        // Prevent saving if we haven't loaded the server's initial progress yet to avoid overwrites
        if (!movieSlug || !episodeSlug || currentTime < 5 || loadedEpisode !== episodeSlug) return;

        // 1. Save to LocalStorage for History Page (Immediate UI update)
        try {
            const history = JSON.parse(localStorage.getItem('history') || '[]');
            const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

            const existingIndex = history.findIndex((h: { slug?: string }) => h.slug === movieSlug);

            if (existingIndex !== -1) {
                history[existingIndex] = {
                    ...history[existingIndex],
                    progress: {
                        currentTime,
                        duration,
                        percentage,
                        episodeSlug,
                        episodeName: episodeName || '',
                        serverName: serverName || '',
                    },
                    viewedAt: new Date().toISOString()
                };

                const item = history.splice(existingIndex, 1)[0];
                history.unshift(item);
                localStorage.setItem('history', JSON.stringify(history));
            } else if (movieName) {
                const newItem = {
                    _id: movieSlug,
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
                        serverName: serverName || '',
                    }
                };
                history.unshift(newItem);
                localStorage.setItem('history', JSON.stringify(history.slice(0, 50)));
            }
        } catch (e) {
            console.error('Error saving local history:', e);
        }

        // 2. Save to API (if user logged in)
        if (serverName) {
            const token = getAuthToken();
            if (token) {
                const payload = JSON.stringify({
                    movieSlug,
                    movieName,
                    movieThumb,
                    episodeSlug,
                    episodeName,
                    serverName,
                    currentTime,
                    duration
                });
                
                try {
                    // Use standard fetch if unmounting to utilize keepalive
                    fetch(`${API_URL}/api/progress/save`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: payload,
                        credentials: 'include',
                        keepalive: isUnmounting // Ensure request finishes if tab closes
                    }).catch(() => {});
                } catch (error) {
                    console.error('[saveProgress] Network error:', error);
                }
            }
        }
    };

    // Debounced and Throttled save
    const debouncedSave = (currentTime: number, duration: number) => {
        lastKnownRef.current = { currentTime, duration };
        const now = Date.now();

        if (now - lastSavedTimeRef.current >= 15000) {
            lastSavedTimeRef.current = now;
            saveProgress(currentTime, duration);
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            return;
        }

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            lastSavedTimeRef.current = Date.now();
            saveProgress(currentTime, duration);
        }, 2000);
    };

    // Instant save on tab close / visibility hidden using keepalive fetch
    useEffect(() => {
        const flushViaBeacon = () => {
            const last = lastKnownRef.current;
            if (!last || !movieSlug || !episodeSlug || !serverName || last.currentTime < 5 || loadedEpisode !== episodeSlug) return;
            saveProgress(last.currentTime, last.duration, true);
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') flushViaBeacon();
        };
        const handleBeforeUnload = () => flushViaBeacon();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Save on SPA navigation unmount (e.g. changing episodes)
            flushViaBeacon();
        };
    }, [movieSlug, episodeSlug, serverName, movieName, movieThumb, episodeName, loadedEpisode]);

    // Provide an explicit flush function so Parent can call it with the current exact time
    const flushSave = (currentTime: number, duration: number) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveProgress(currentTime, duration);
    };

    return {
        initialProgress,
        saveProgress,
        debouncedSave,
        flushSave
    };
}
