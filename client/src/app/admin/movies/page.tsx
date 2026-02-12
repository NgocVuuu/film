'use client';
import { useState, useEffect } from 'react';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, Star, StarOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface Movie {
    _id: string;
    name: string;
    slug: string;
    thumb_url: string;
    type: string;
    status: string;
    view: number;
    isFeatured: boolean;
    isActive: boolean;
    year: number;
    episode_current: string;
}

export default function AdminMoviesPage() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchMovies = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '24'
            });
            if (search) queryParams.append('search', search);

            const res = await customFetch(`/api/admin/movies?${queryParams}`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                setMovies(data.data);
                setTotalPages(data.pagination.totalPages);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Fetch movies error:', error);
            toast.error('Lỗi khi tải danh sách phim');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMovies();
    }, [page]);

    const handleSearch = () => {
        setPage(1);
        fetchMovies();
    };

    const handleToggleFeatured = async (slug: string) => {
        try {
            const res = await customFetch(`/api/admin/movies/${slug}/featured`, {
                method: 'PATCH',
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                toast.success(data.message);
                fetchMovies();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Toggle featured error:', error);
            toast.error('Lỗi khi cập nhật');
        }
    };

    const handleDelete = async (slug: string, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa phim "${name}"?`)) return;

        try {
            const res = await customFetch(`/api/admin/movies/${slug}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                toast.success(data.message);
                fetchMovies();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Delete movie error:', error);
            toast.error('Lỗi khi xóa phim');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Quản lý Phim</h1>

                <div className="flex gap-2">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Tìm kiếm phim..."
                        className="bg-surface-800 border-white/10 text-white w-64"
                    />
                    <Button onClick={handleSearch}>Tìm</Button>
                </div>
            </div>

            <div className="bg-surface-900 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-surface-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Ảnh</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Tên phim</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Loại</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Trạng thái</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Lượt xem</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Nổi bật</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {movies.map((movie) => (
                            <tr key={movie._id} className="hover:bg-surface-800/50">
                                <td className="px-4 py-3">
                                    <img src={movie.thumb_url} alt={movie.name} className="w-16 h-24 object-cover rounded" />
                                </td>
                                <td className="px-4 py-3 text-sm text-white">
                                    <div className="font-medium">{movie.name}</div>
                                    <div className="text-xs text-gray-400">{movie.year}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-400">{movie.type}</td>
                                <td className="px-4 py-3 text-sm text-gray-400">{movie.status}</td>
                                <td className="px-4 py-3 text-sm text-gray-400">{movie.view.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm">
                                    {movie.isFeatured ? (
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    ) : (
                                        <StarOff className="w-4 h-4 text-gray-500" />
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleFeatured(movie.slug)}
                                        >
                                            {movie.isFeatured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(movie.slug, movie.name)}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    Trước
                </Button>
                <span className="text-white">Trang {page} / {totalPages}</span>
                <Button
                    variant="outline"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                >
                    Sau
                </Button>
            </div>
        </div>
    );
}
