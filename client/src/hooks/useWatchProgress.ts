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
    const saveProgress = async (currentTime: number, duration: number) => {
        // Prevent saving if we haven't loaded the server's initial progress yet to avoid overwrites
        if (!movieSlug || !episodeSlug || currentTime < 5 || loadedEpisode !== episodeSlug) return;

        // 1. Save to LocalStorage for History Page (Immediate UI update)
        try {
            const history = JSON.parse(localStorage.getItem('history') || '[]');
            const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

            // Allow update if movie exists in history
            const existingIndex = history.findIndex((h: { slug?: string }) => h.slug === movieSlug);

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
                        serverName: serverName || '',
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
                            serverName: serverName || '',
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
                const response = await customFetch(`/api/progress/save`, {
                    method: 'POST',
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

                if (!response.ok) {
                    console.error('[saveProgress] API Error:', data);
                }
            } catch (error) {
                console.error('[saveProgress] Network error:', error);
            }
        }
    };

    // Debounced and Throttled save - saves after user stops seeking for 2s, 
    // OR every 15 seconds during continuous playback to ensure progress is captured
    const debouncedSave = (currentTime: number, duration: number) => {
        lastKnownRef.current = { currentTime, duration };
        const now = Date.now();

        // Throttle: If we haven't saved in 15 seconds, save immediately
        if (now - lastSavedTimeRef.current >= 15000) {
            lastSavedTimeRef.current = now;
            saveProgress(currentTime, duration);
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            return;
        }

        // Debounce: Always reset the 2-second timer
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            lastSavedTimeRef.current = Date.now();
            saveProgress(currentTime, duration);
        }, 2000); // 2s after last timeupdate (paused or stopped seeking)
    };

    // Instant save on tab close / visibility hidden using sendBeacon so it survives page unload
    useEffect(() => {
        const flushViaBeacon = () => {
            const last = lastKnownRef.current;
            if (!last || !user || !movieSlug || !episodeSlug || !serverName || last.currentTime < 5 || loadedEpisode !== episodeSlug) return;
            const token = getAuthToken();
            const payload = JSON.stringify({
                movieSlug,
                movieName,
                movieThumb,
                episodeSlug,
                episodeName,
                serverName,
                currentTime: last.currentTime,
                duration: last.duration,
            });
            const url = `${API_URL}/api/progress/save`;
            if (token) {
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: payload,
                    credentials: 'include',
                    keepalive: true // Cờ quan trọng: Đảm bảo request hoàn thành sau khi Browser tắt
                }).catch(() => {});
            }
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
            // Save on SPA navigation unmount
            flushViaBeacon();
        };
    }, [user, movieSlug, episodeSlug, serverName, movieName, movieThumb, episodeName]);

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
