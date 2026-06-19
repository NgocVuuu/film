'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, Star, StarOff, Edit, Eye, EyeOff, RefreshCw } from 'lucide-react';
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
    diagnostics?: {
        free: { total: number; missing: number[]; duplicate: number[]; incomplete: boolean };
        vip: { total: number; missing: number[]; duplicate: number[]; incomplete: boolean };
    };
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
    const [currentTab, setCurrentTab] = useState<'all' | 'errors'>('all');
    const [syncingSlugs, setSyncingSlugs] = useState<Set<string>>(new Set());
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [syncAllStatus, setSyncAllStatus] = useState({ total: 0, current: 0 });

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
            if (currentTab === 'errors') {
                queryParams.append('errorOnly', 'true');
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
    }, [page, debouncedSearch, isActiveFilter, currentTab]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 1000); // Tăng thời gian chờ gõ lên 1 giây

        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchMovies();
    }, [fetchMovies]);

    // Polling trạng thái sync all
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isSyncingAll) {
            interval = setInterval(async () => {
                try {
                    const res = await customFetch('/api/admin/movies/sync-tmdb-all/status', { credentials: 'include' });
                    const data = await res.json();
                    if (data.success) {
                        setSyncAllStatus({ total: data.data.total, current: data.data.current });
                        if (!data.data.isRunning) {
                            setIsSyncingAll(false);
                            toast.success('Hoàn tất đồng bộ toàn bộ TMDB!');
                            fetchMovies();
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isSyncingAll, fetchMovies]);

    const handleSearch = () => {
        setPage(1);
        fetchMovies();
    };

    const handleSyncTmdb = async (slug: string) => {
        try {
            setSyncingSlugs(prev => new Set(prev).add(slug));
            toast.loading('Đang đồng bộ TMDB...', { id: `sync-${slug}` });
            const res = await customFetch(`/api/admin/movies/${slug}/sync-tmdb`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message, { id: `sync-${slug}` });
            } else {
                toast.error(data.message, { id: `sync-${slug}` });
            }
        } catch (error) {
            toast.error('Lỗi khi đồng bộ TMDB', { id: `sync-${slug}` });
        } finally {
            setSyncingSlugs(prev => {
                const next = new Set(prev);
                next.delete(slug);
                return next;
            });
        }
    };

    const handleSyncAllTmdb = async () => {
        if (!confirm('Hệ thống sẽ quét ngầm toàn bộ DB để đồng bộ phim chưa có ảnh diễn viên. Tiếp tục?')) return;
        try {
            const res = await customFetch('/api/admin/movies/sync-tmdb-all', {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                setIsSyncingAll(true);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Lỗi yêu cầu đồng bộ.');
        }
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

    const handleRestore = async (slug: string) => {
        if (!confirm('Bạn có chắc muốn hiện lại phim này?')) return;
        try {
            const res = await customFetch(`/api/admin/movies/${slug}/active`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: true }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã hiện lại phim');
                fetchMovies();
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error('Lỗi khi hiện lại phim');
        }
    };

    const handleDelete = async (slug: string, isPermanent: boolean) => {
        const message = isPermanent
            ? 'Bạn có chắc chắn muốn XÓA VĨNH VIỄN phim này? Hành động này không thể hoàn tác.'
            : 'Bạn có chắc muốn ẩn phim này?';

        if (!confirm(message)) return;

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
        } catch {
            toast.error('Lỗi khi thực hiện yêu cầu');
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
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-6">
                <div className="flex flex-col gap-1 shrink-0">
                    <h1 className="text-2xl font-bold text-white">Quản lý Phim</h1>
                    <p className="text-sm text-gray-400">Quản lý kho phim, nổi bật, ẩn/hiện và quét TMDB.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1 lg:justify-end">
                    {/* Status Filter */}
                    <div className="flex items-center bg-surface-800 p-1.5 rounded-xl border border-white/10 shrink-0">
                        <span className="text-[10px] text-gray-500 px-3 uppercase font-black tracking-widest hidden sm:inline">Trạng thái</span>
                        <div className="relative">
                            <select
                                value={isActiveFilter}
                                onChange={(e) => {
                                    setIsActiveFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-surface-900 border border-white/5 text-white h-10 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer hover:bg-surface-700 min-w-[130px]"
                            >
                                <option value="true" className="bg-surface-900 py-2">Đang hiện</option>
                                <option value="false" className="bg-surface-900 py-2 text-red-400 font-bold">Đã xóa/ẩn</option>
                                <option value="all" className="bg-surface-900 py-2">Tất cả</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Scraper Range */}
                    <div className="flex items-center bg-surface-800 p-1.5 rounded-xl border border-white/10 shrink-0">
                        <span className="text-[10px] text-gray-500 px-3 uppercase font-black tracking-widest hidden md:inline">Quét TMDB</span>
                        <div className="flex items-center gap-1.5">
                            <Input
                                type="number"
                                placeholder="Từ"
                                className="bg-surface-900 border-white/5 text-white w-16 h-10 text-sm text-center px-1"
                                id="fromPage"
                            />
                            <span className="text-gray-600 font-bold">-</span>
                            <Input
                                type="number"
                                placeholder="Đến"
                                className="bg-surface-900 border-white/5 text-white w-16 h-10 text-sm text-center px-1"
                                id="toPage"
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="bg-primary/20 text-primary hover:bg-primary/30 border-none h-10 px-4 ml-2"
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

                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        <div className="flex gap-2 w-full">
                            <Input
                                placeholder="Tên, diễn viên, năm..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="bg-surface-900 border-white/10 text-white min-w-[200px]"
                            />
                            <Button onClick={handleSearch} className="h-10 px-6 shrink-0">Tìm</Button>
                        </div>
                        <Button 
                            onClick={handleSyncAllTmdb} 
                            disabled={isSyncingAll}
                            variant="outline" 
                            className="border-primary/50 text-primary hover:bg-primary/10 whitespace-nowrap"
                        >
                            {isSyncingAll ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Đang quét: {syncAllStatus.current}/{syncAllStatus.total}
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Quét toàn bộ TMDB
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-white/10">
                <button
                    onClick={() => { setCurrentTab('all'); setPage(1); }}
                    className={`pb-3 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${currentTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'}`}
                >
                    Tất cả Phim
                </button>
                <button
                    onClick={() => { setCurrentTab('errors'); setPage(1); }}
                    className={`pb-3 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${currentTab === 'errors' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-red-400'}`}
                >
                    Phim bị lỗi (Thiếu/Trùng)
                </button>
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
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Tình trạng tập</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Lượt xem</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Nổi bật</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {movies.map((movie) => (
                                <tr key={movie._id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="relative w-12 h-16 group-hover:scale-110 transition-transform duration-300 bg-surface-800 rounded-md">
                                            {movie.thumb_url ? (
                                                <Image
                                                    src={movie.thumb_url}
                                                    alt={movie.name}
                                                    fill
                                                    sizes="48px"
                                                    className="object-cover rounded-md shadow-lg"
                                                />
                                            ) : null}
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
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${movie.status === 'completed' ? 'border-green-500/20 text-green-500 bg-green-500/5' : 'border-yellow-500/20 text-yellow-500 bg-yellow-500/5'}`}>{movie.status}</span>
                                            {!movie.isActive && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-red-500/20 text-red-500 bg-red-500/5 uppercase font-bold">Đã ẩn</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {movie.type !== 'single' && movie.diagnostics ? (
                                            <div className="flex flex-col gap-3">
                                                {/* Free Server */}
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">FREE ({movie.diagnostics.free.total}/{movie.episode_current ? String(movie.episode_current).match(/\d+/)?.[0] : '?'})</span>
                                                    {movie.diagnostics.free.missing.length > 0 && <span className="text-[10px] text-red-400">Thiếu: {movie.diagnostics.free.missing.slice(0, 3).join(', ')}{movie.diagnostics.free.missing.length > 3 ? '...' : ''}</span>}
                                                    {movie.diagnostics.free.duplicate.length > 0 && <span className="text-[10px] text-yellow-500">Trùng: {movie.diagnostics.free.duplicate.slice(0, 3).join(', ')}{movie.diagnostics.free.duplicate.length > 3 ? '...' : ''}</span>}
                                                    {movie.diagnostics.free.missing.length === 0 && movie.diagnostics.free.duplicate.length === 0 && movie.diagnostics.free.incomplete && <span className="text-[10px] text-orange-400">Chưa đủ tập</span>}
                                                    {movie.diagnostics.free.missing.length === 0 && movie.diagnostics.free.duplicate.length === 0 && !movie.diagnostics.free.incomplete && <span className="text-[10px] text-green-500">Đầy đủ</span>}
                                                </div>
                                                {/* VIP Server */}
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">VIP ({movie.diagnostics.vip.total}/{movie.episode_current ? String(movie.episode_current).match(/\d+/)?.[0] : '?'})</span>
                                                    {movie.diagnostics.vip.missing.length > 0 && <span className="text-[10px] text-red-400">Thiếu: {movie.diagnostics.vip.missing.slice(0, 3).join(', ')}{movie.diagnostics.vip.missing.length > 3 ? '...' : ''}</span>}
                                                    {movie.diagnostics.vip.duplicate.length > 0 && <span className="text-[10px] text-yellow-500">Trùng: {movie.diagnostics.vip.duplicate.slice(0, 3).join(', ')}{movie.diagnostics.vip.duplicate.length > 3 ? '...' : ''}</span>}
                                                    {movie.diagnostics.vip.missing.length === 0 && movie.diagnostics.vip.duplicate.length === 0 && movie.diagnostics.vip.incomplete && <span className="text-[10px] text-orange-400">Chưa đủ tập</span>}
                                                    {movie.diagnostics.vip.missing.length === 0 && movie.diagnostics.vip.duplicate.length === 0 && !movie.diagnostics.vip.incomplete && <span className="text-[10px] text-green-500">Đầy đủ</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-500 border border-gray-500/20 bg-gray-500/10 px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">Phim lẻ</span>
                                        )}
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
                                                title={movie.isFeatured ? 'Bỏ nổi bật' : 'Thêm nổi bật'}
                                            >
                                                {movie.isFeatured ? <Star className="w-4 h-4 fill-current" /> : <Star className="w-4 h-4" />}
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-9 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all"
                                                onClick={() => handleSyncTmdb(movie.slug)}
                                                title="Đồng bộ TMDB (Lấy diễn viên)"
                                                disabled={syncingSlugs.has(movie.slug)}
                                            >
                                                <RefreshCw className={`w-4 h-4 ${syncingSlugs.has(movie.slug) ? 'animate-spin opacity-50' : ''}`} />
                                            </Button>

                                            {movie.isActive ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                    onClick={() => handleDelete(movie.slug, false)}
                                                    title="Ẩn phim"
                                                >
                                                    <EyeOff className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 w-9 p-0 text-green-500 hover:bg-green-500/10 transition-all"
                                                        onClick={() => handleRestore(movie.slug)}
                                                        title="Hiện lại phim"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 w-9 p-0 text-red-500 hover:bg-red-500/20 transition-all"
                                                        onClick={() => handleDelete(movie.slug, true)}
                                                        title="XÓA VĨNH VIỄN"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
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
