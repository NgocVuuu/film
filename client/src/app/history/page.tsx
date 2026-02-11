'use client';
import { useEffect, useState } from 'react';
import { ContinueWatchingCard } from '@/components/ContinueWatchingCard';
import { EmptyState } from '@/components/EmptyState';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { API_URL } from '@/lib/config';
import toast from 'react-hot-toast';

export default function HistoryPage() {
    const { user } = useAuth();
    const [movies, setMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
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
            const response = await fetch(`${API_URL}/api/progress/continue-watching?limit=100`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success && data.data && data.data.length > 0) {
                    // Backend returns WatchProgress objects directly
                    const moviesWithProgress = data.data
                        .filter((item: any) => item.movieSlug && item.movieName) // Ensure valid data
                        .map((item: any) => ({
                            _id: item.movieId || item.movieSlug,
                            name: item.movieName,
                            slug: item.movieSlug,
                            thumb_url: item.movieThumb,
                            year: new Date().getFullYear(),
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
        } catch (error) {
            console.error('[HistoryPage] Error fetching history:', error);
            // Don't fallback to localStorage for logged-in users - show empty state
            setMovies([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [user]);

    const clearHistory = async () => {
        if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) return;

        if (user) {
            try {
                // TODO: Add API endpoint to clear all progress
                toast.success('Tính năng xóa lịch sử đang được phát triển');
            } catch (error) {
                toast.error('Có lỗi xảy ra');
            }
        } else {
            // Clear localStorage for non-logged-in users
            setMovies([]);
            localStorage.setItem('history', JSON.stringify([]));
            toast.success('Đã xóa lịch sử');
        }
    };

    return (
        <div className="min-h-screen bg-deep-black text-white pt-24 pb-20 lg:pb-10">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gold-gradient">Đang Xem</h1>
                    {movies.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={clearHistory}
                            className="border-red-500/50 text-red-500 hover:bg-red-900/20"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Xóa Lịch Sử
                        </Button>
                    )}
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
                            <ContinueWatchingCard key={`${movie.slug}-${movie.progress?.episodeSlug}`} movie={movie} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
