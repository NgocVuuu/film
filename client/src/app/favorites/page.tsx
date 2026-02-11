'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { API_URL } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { MovieCard } from '@/components/MovieCard';
import { EmptyState } from '@/components/EmptyState';
import { Trash2, Loader2 } from 'lucide-react';

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState<any[]>([]);
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        const fetchData = async () => {
            setLoading(true);
            if (user) {
                try {
                    const res = await fetch(`${API_URL}/api/favorites`, { credentials: 'include' });
                    const data = await res.json();
                    if (data.success) {
                        // Backend returns favorites which has 'movie' populated. Map it to flat structure or meaningful structure
                        const mapped = data.data.map((fav: any) => ({
                            ...fav.movie,
                            // Ensure properties exist
                            thumb_url: fav.movie?.thumb_url || fav.thumbUrl,
                            name: fav.movie?.name || fav.movieName,
                            slug: fav.movieSlug
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
                await fetch(`${API_URL}/api/favorites/${slug}`, { method: 'DELETE', credentials: 'include' });
                setFavorites(prev => prev.filter(m => m.slug !== slug));
            } catch (e) { console.error(e); }
        } else {
            const newFavs = favorites.filter((m) => m.slug !== slug);
            setFavorites(newFavs);
            localStorage.setItem('favorites', JSON.stringify(newFavs));
        }
    };

    if (loading) return <div className="min-h-screen pt-24 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen bg-deep-black text-white pt-24 pb-10">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold mb-8 text-gold-gradient inline-block">Tủ Phim Yêu Thích</h1>

                {favorites.length === 0 ? (
                    <EmptyState
                        title="Chưa có phim yêu thích"
                        description="Bạn chưa lưu bộ phim nào vào danh sách yêu thích. Hãy khám phá ngay!"
                        actionLink="/phim-moi"
                    />
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {favorites.map((movie) => (
                            <div key={movie.slug} className="relative group">
                                <MovieCard movie={movie} />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        removeFavorite(movie.slug);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
