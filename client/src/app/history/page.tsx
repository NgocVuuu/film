'use client';
import { useEffect, useState, useCallback } from 'react';
import { ContinueWatchingCard } from '@/components/ContinueWatchingCard';
import { EmptyState } from '@/components/EmptyState';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { customFetch } from '@/lib/api';
import toast from 'react-hot-toast';

interface WatchProgressResponse {
    movieId?: string;
    movieSlug: string;
    movieName: string;
    movieThumb: string;
    currentTime: number;
    duration: number;
    episodeSlug?: string;
    episodeName?: string;
}

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    year: number;
    episode_current?: string;
    progress: {
        currentTime: number;
        duration: number;
        percentage: number;
        episodeSlug: string;
        episodeName: string;
    };
}

export default function HistoryPage() {
    const { user } = useAuth();
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        if (!user) {
            // If not logged in, use localStorage fallback
            const stored = JSON.parse(localStorage.getItem('history') || '[]');
            setMovies(stored);
            setLoading(false);
            return;
        }

        // IMPORTANT: Clear localStorage for logged-in users to prevent mixing with backend data
        localStorage.removeItem('history');

        // Force clear state to prevent rendering stale/empty objects
        setMovies([]);

        try {
            const response = await customFetch(`/api/progress/continue-watching?limit=100`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success && data.data && data.data.length > 0) {
                    // Backend returns WatchProgress objects directly
                    const moviesWithProgress = data.data
                        .filter((item: WatchProgressResponse) => item.movieSlug && item.movieName) // Ensure valid data
                        .map((item: WatchProgressResponse) => ({
                            _id: item.movieId || item.movieSlug,
                            name: item.movieName,
                            origin_name: item.movieName,
                            slug: item.movieSlug,
                            thumb_url: item.movieThumb,
                            year: new Date().getFullYear(),
                            episode_current: item.episodeSlug,
                            progress: {
                                currentTime: item.currentTime || 0,
                                duration: item.duration || 0,
                                percentage: item.duration > 0 ? Math.round((item.currentTime / item.duration) * 100) : 0,
                                episodeSlug: item.episodeSlug || '1',
                                episodeName: item.episodeName || 'Tập 1'
                            }
                        }));
                    setMovies(moviesWithProgress);
                } else {
                    // No data from API - show empty state
                    setMovies([]);
                }
            } else {
                console.error('[HistoryPage] Response not OK:', response.status);
                setMovies([]);
            }
        } catch {
            console.error('[HistoryPage] Error fetching history');
            // Don't fallback to localStorage for logged-in users - show empty state
            setMovies([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const removeHistory = async (slug: string, epSlug: string) => {
        if (user) {
            try {
                await customFetch(`/api/progress/${slug}/${epSlug}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                setMovies(prev => prev.filter(m => !(m.slug === slug && m.progress.episodeSlug === epSlug)));
                toast.success('Đã xóa khỏi lịch sử');
            } catch {
                toast.error('Có lỗi xảy ra');
            }
        } else {
            const currentHistory = JSON.parse(localStorage.getItem('history') || '[]');
            const newHistory = currentHistory.filter((m: Movie) => !(m.slug === slug && m.progress.episodeSlug === epSlug));
            setMovies(newHistory);
            localStorage.setItem('history', JSON.stringify(newHistory));
            toast.success('Đã xóa khỏi lịch sử');
        }
    };

    const clearHistory = async () => {
        if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) return;

        if (user) {
            try {
                await customFetch(`/api/progress/clear-all`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                setMovies([]);
                toast.success('Đã xóa toàn bộ lịch sử');
            } catch {
                toast.error('Có lỗi xảy ra');
            }
        } else {
            setMovies([]);
            localStorage.setItem('history', JSON.stringify([]));
            toast.success('Đã xóa toàn bộ lịch sử');
        }
    };

    const [isEdit, setIsEdit] = useState(false);

    return (
        <div className="min-h-screen bg-deep-black text-white pt-24 pb-20 lg:pb-10">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h1 className="text-3xl font-bold text-gold-gradient">Đang Xem</h1>
                    <div className="flex items-center gap-2">
                        {movies.length > 0 && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEdit(!isEdit)}
                                    className={`border-white/20 ${isEdit ? 'bg-primary text-black hover:bg-primary/80 dark:bg-primary dark:text-black' : 'text-gray-400 hover:text-white dark:bg-surface-800'}`}
                                >
                                    {isEdit ? 'Hoàn tất' : 'Chỉnh sửa'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={clearHistory}
                                    className="border-red-500/50 text-red-500 hover:bg-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Xóa Lịch Sử
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : movies.length === 0 ? (
                    <EmptyState
                        title="Chưa có phim đang xem"
                        description="Bạn chưa xem phim nào gần đây. Hãy bắt đầu trải nghiệm ngay!"
                        actionLink="/"
                        icon={Clock}
                    />
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {movies.map((movie) => (
                            <div key={`${movie.slug}-${movie.progress?.episodeSlug}`} className="relative">
                                <ContinueWatchingCard
                                    movie={movie}
                                    onRemove={isEdit ? removeHistory : undefined}
                                />
                                {isEdit && (
                                    <div className="absolute inset-0 bg-black/40 pointer-events-none rounded-md border-2 border-primary/50" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
