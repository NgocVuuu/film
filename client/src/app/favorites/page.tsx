'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { API_URL } from '@/lib/config';
import { getAuthToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { MovieCard } from '@/components/MovieCard';
import { EmptyState } from '@/components/EmptyState';
import { Trash2, Loader2 } from 'lucide-react';

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    year: number;
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

interface FavoriteResponse {
    movieSlug: string;
    movieName?: string;
    thumbUrl?: string;
    movie?: {
        _id?: string;
        name?: string;
        origin_name?: string;
        slug?: string;
        thumb_url?: string;
        year?: number;
        episode_current?: string;
        quality?: string;
    };
}

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState<Movie[]>([]);
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        const fetchData = async () => {
            setLoading(true);
            if (user) {
                try {
                    const token = getAuthToken();
                    const headers: Record<string, string> = {};
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                    const res = await fetch(`${API_URL}/api/favorites`, { credentials: 'include', headers });
                    const data = await res.json();
                    if (data.success) {
                        // Backend returns favorites which has 'movie' populated. Map it to flat structure or meaningful structure
                        const mapped = data.data.map((fav: FavoriteResponse) => ({
                            _id: fav.movie?._id || fav.movieSlug,
                            name: fav.movie?.name || fav.movieName || '',
                            origin_name: fav.movie?.origin_name || '',
                            slug: fav.movieSlug || fav.movie?.slug || '',
                            thumb_url: fav.movie?.thumb_url || fav.thumbUrl || '',
                            year: fav.movie?.year || new Date().getFullYear(),
                            episode_current: fav.movie?.episode_current,
                            quality: fav.movie?.quality
                        }));
                        setFavorites(mapped);
                    }
                } catch (e) {
                    console.error(e);
                }
            } else {
                const stored = JSON.parse(localStorage.getItem('favorites') || '[]');
                setFavorites(stored);
            }
            setLoading(false);
        };

        fetchData();
    }, [user, authLoading]);

    const removeFavorite = async (slug: string) => {
        if (user) {
            try {
                const token = getAuthToken();
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                await fetch(`${API_URL}/api/favorites/${slug}`, { method: 'DELETE', credentials: 'include', headers });
                setFavorites(prev => prev.filter(m => m.slug !== slug));
            } catch (e) { console.error(e); }
        } else {
            const newFavs = favorites.filter((m) => m.slug !== slug);
            setFavorites(newFavs);
            localStorage.setItem('favorites', JSON.stringify(newFavs));
        }
    };

    const [isEdit, setIsEdit] = useState(false);

    if (loading) return <div className="min-h-screen pt-24 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen bg-deep-black text-white pt-24 pb-10">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gold-gradient inline-block">Tủ Phim Yêu Thích</h1>
                    {favorites.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => setIsEdit(!isEdit)}
                            className={`border-white/20 h-9 ${isEdit ? 'bg-primary text-black hover:bg-primary/80 dark:bg-primary dark:text-black font-bold' : 'text-gray-400 hover:text-white dark:bg-surface-800'}`}
                        >
                            {isEdit ? 'Hoàn tất' : 'Chỉnh sửa'}
                        </Button>
                    )}
                </div>

                {favorites.length === 0 ? (
                    <EmptyState
                        title="Chưa có phim yêu thích"
                        description="Bạn chưa lưu bộ phim nào vào danh sách yêu thích. Hãy khám phá ngay!"
                        actionLink="/phim-moi"
                    />
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {favorites.map((movie) => (
                            <div key={movie.slug} className="relative group">
                                <MovieCard movie={movie} isEditing={isEdit} />
                                <div className={`absolute inset-0 bg-black/40 pointer-events-none rounded-md transition-opacity ${isEdit ? 'opacity-100 border-2 border-primary/50' : 'opacity-0'}`} />
                                {(isEdit || true) && (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className={`absolute top-1.5 right-1.5 z-20 w-7 h-7 rounded-full bg-red-600/90 shadow-md transition-all active:scale-90 
                                            ${isEdit ? 'opacity-100 pointer-events-auto' : 'opacity-0 md:group-hover:opacity-100 pointer-events-none md:pointer-events-auto'}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            removeFavorite(movie.slug);
                                        }}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
