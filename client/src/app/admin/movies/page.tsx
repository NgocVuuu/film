'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, Star, StarOff, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

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
    const router = useRouter();
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isActiveFilter, setIsActiveFilter] = useState<string>('true');

    const fetchMovies = useCallback(async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '24'
            });
            if (debouncedSearch) queryParams.append('search', debouncedSearch);
            if (isActiveFilter !== 'all') {
                queryParams.append('isActive', isActiveFilter);
            }

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
    }, [page, debouncedSearch, isActiveFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchMovies();
    }, [fetchMovies]);

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

    const handleToggleActive = async (slug: string, currentStatus: boolean) => {
        const action = currentStatus ? 'ẩn' : 'hiện';
        if (!confirm(`Bạn có chắc muốn ${action} phim này?`)) return;

        try {
            const res = await customFetch(`/api/admin/movies/${slug}/active`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
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
            console.error('Toggle active error:', error);
            toast.error('Lỗi khi cập nhật trạng thái');
        }
    };

    const handleDelete = async (slug: string, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa (ẩn) phim "${name}"?`)) return;

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
        <div className="p-4 md:p-6">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 gap-6">
                <h1 className="text-2xl font-bold text-white shrink-0">Quản lý Phim</h1>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-surface-800 p-2 rounded-xl border border-white/10">
                        <span className="text-[10px] text-gray-500 px-2 uppercase font-black tracking-widest hidden sm:inline">Trạng thái</span>
                        <select
                            value={isActiveFilter}
                            onChange={(e) => {
                                setIsActiveFilter(e.target.value);
                                setPage(1);
                            }}
                            className="bg-surface-900 border border-white/5 text-white h-9 px-3 rounded-lg text-xs focus:outline-none focus:border-primary transition-colors"
                        >
                            <option value="true">Đang hiện</option>
                            <option value="false">Đã xóa/ẩn</option>
                            <option value="all">Tất cả</option>
                        </select>
                    </div>

                    {/* Scraper Range */}
                    <div className="flex flex-wrap items-center gap-2 bg-surface-800 p-2 rounded-xl border border-white/10 flex-1 md:flex-initial">
                        <span className="text-[10px] text-gray-500 px-2 uppercase font-black tracking-widest hidden sm:inline">Quét nhanh</span>
                        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                            <Input
                                type="number"
                                placeholder="Từ"
                                className="bg-surface-900 border-white/5 text-white w-14 h-9 text-xs"
                                id="fromPage"
                            />
                            <span className="text-gray-500">-</span>
                            <Input
                                type="number"
                                placeholder="Đến"
                                className="bg-surface-900 border-white/5 text-white w-14 h-9 text-xs"
                                id="toPage"
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="bg-primary/20 text-primary hover:bg-primary/30 border-none h-9 px-4"
                            onClick={async () => {
                                const from = (document.getElementById('fromPage') as HTMLInputElement).value;
                                const to = (document.getElementById('toPage') as HTMLInputElement).value;
                                if (!from || !to) return toast.error('Vui lòng nhập dải trang');
                                try {
                                    const res = await customFetch('/api/admin/crawler/sync', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ fromPage: parseInt(from), toPage: parseInt(to) }),
                                        credentials: 'include'
                                    });
                                    const data = await res.json();
                                    if (data.success) toast.success(data.message);
                                    else toast.error(data.message);
                                } catch {
                                    toast.error('Lỗi khi gửi yêu cầu');
                                }
                            }}
                        >
                            Quét
                        </Button>
                    </div>

                    <div className="flex gap-2 flex-1 md:flex-initial">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Tìm kiếm phim..."
                            className="bg-surface-800 border-white/10 text-white flex-1 md:w-64 h-11 md:h-10"
                        />
                        <Button onClick={handleSearch} className="h-11 md:h-10 px-6">Tìm</Button>
                    </div>
                </div>
            </div>

            <div className="bg-surface-900 rounded-xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                    <table className="w-full min-w-[1000px]">
                        <thead className="bg-surface-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Ảnh</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Tên phim</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Loại</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Trạng thái</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Lượt xem</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Nổi bật</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {movies.map((movie) => (
                                <tr key={movie._id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="relative w-12 h-16 group-hover:scale-110 transition-transform duration-300">
                                            <Image
                                                src={movie.thumb_url}
                                                alt={movie.name}
                                                fill
                                                sizes="48px"
                                                className="object-cover rounded-md shadow-lg"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{movie.name}</div>
                                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">{movie.year} • {movie.slug}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs px-2 py-1 bg-white/5 rounded text-gray-400 border border-white/5 uppercase font-medium">{movie.type}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs px-2 py-1 rounded border ${movie.status === 'completed' ? 'border-green-500/20 text-green-500 bg-green-500/5' : 'border-yellow-500/20 text-yellow-500 bg-yellow-500/5'}`}>{movie.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-gray-400">{movie.view.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        {movie.isFeatured ? (
                                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                                        ) : (
                                            <StarOff className="w-5 h-5 text-gray-600" />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-9 p-0 hover:bg-primary/20 hover:text-primary"
                                                onClick={() => router.push(`/admin/movies/${movie.slug}`)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-9 w-9 p-0 transition-all ${movie.isFeatured ? 'text-yellow-500 hover:bg-yellow-500/20' : 'text-gray-400 hover:bg-white/10'}`}
                                                onClick={() => handleToggleFeatured(movie.slug)}
                                            >
                                                {movie.isFeatured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-9 w-9 p-0 transition-all ${movie.isActive ? 'text-gray-500 hover:text-red-500 hover:bg-red-500/20' : 'text-green-500 hover:bg-green-500/20'}`}
                                                onClick={() => handleToggleActive(movie.slug, movie.isActive)}
                                                title={movie.isActive ? 'Ẩn phim' : 'Hiện phim'}
                                            >
                                                {movie.isActive ? <Trash2 className="w-4 h-4" /> : <Star className="w-4 h-4 rotate-45" />}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
