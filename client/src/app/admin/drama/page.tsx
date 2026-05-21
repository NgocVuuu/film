'use client';
import { useState, useEffect, useCallback } from 'react';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Flame, RefreshCw, Search, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface DramaMovie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    fire_count: number;
    trash_count: number;
    year: number;
    quality: string;
}

interface ReactionLog {
    _id: string;
    movieSlug: string;
    type: 'fire' | 'trash';
    createdAt: string;
    user: {
        displayName: string;
        email: string;
        avatar?: string;
    };
}

export default function AdminDramaPage() {
    const [subTab, setSubTab] = useState<'ranking' | 'logs'>('ranking');
    const [movies, setMovies] = useState<DramaMovie[]>([]);
    const [logs, setLogs] = useState<ReactionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'fire' | 'trash' | 'total'>('total');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Inline editing states
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [editFire, setEditFire] = useState(0);
    const [editTrash, setEditTrash] = useState(0);
    const [saving, setSaving] = useState(false);

    // 1. Fetch Drama Movies
    const fetchDramaMovies = useCallback(async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                search,
                sortBy
            });
            const res = await customFetch(`/api/admin/drama/movies?${queryParams}`, {
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
            console.error('Fetch drama movies error:', error);
            toast.error('Lỗi khi tải bảng xếp hạng');
        } finally {
            setLoading(false);
        }
    }, [page, search, sortBy]);

    // 2. Fetch Voting Logs
    const fetchVotingLogs = useCallback(async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                search
            });
            const res = await customFetch(`/api/admin/drama/reactions?${queryParams}`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                setLogs(data.data);
                setTotalPages(data.pagination.totalPages);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Fetch voting logs error:', error);
            toast.error('Lỗi khi tải nhật ký bình chọn');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        setPage(1);
    }, [subTab, search, sortBy]);

    useEffect(() => {
        if (subTab === 'ranking') {
            fetchDramaMovies();
        } else {
            fetchVotingLogs();
        }
    }, [subTab, fetchDramaMovies, fetchVotingLogs, page]);

    // Save inline edits
    const handleSaveCounts = async (slug: string) => {
        try {
            setSaving(true);
            const res = await customFetch(`/api/admin/drama/movies/${slug}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fire_count: editFire,
                    trash_count: editTrash
                }),
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Đã cập nhật lượt bình chọn');
                setEditingSlug(null);
                fetchDramaMovies();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Save counts error:', error);
            toast.error('Lỗi khi lưu');
        } finally {
            setSaving(false);
        }
    };

    // Delete a single vote log
    const handleDeleteVote = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa lượt bình chọn này? Lượt bình chọn tương ứng của phim sẽ bị trừ đi 1.')) return;

        try {
            const res = await customFetch(`/api/admin/drama/reactions/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Đã xóa lượt bình chọn thành công');
                fetchVotingLogs();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Delete vote error:', error);
            toast.error('Lỗi khi xóa lượt bình chọn');
        }
    };

    const startEditing = (movie: DramaMovie) => {
        setEditingSlug(movie.slug);
        setEditFire(movie.fire_count);
        setEditTrash(movie.trash_count);
    };

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <Flame className="w-8 h-8 text-orange-500 fill-current" />
                        Quản lý Bình chọn & Góc Drama
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Quản lý điểm số Siêu Phẩm (🔥), Rác Phẩm (🍅) và nhật ký bình chọn của người dùng.
                    </p>
                </div>

                {/* Sub Tab Toggle */}
                <div className="flex p-1 bg-white/[0.05] rounded-xl border border-white/10 shrink-0">
                    <button
                        onClick={() => setSubTab('ranking')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === 'ranking' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Bảng xếp hạng phim
                    </button>
                    <button
                        onClick={() => setSubTab('logs')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === 'logs' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Nhật ký bình chọn
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                {/* Search */}
                <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={subTab === 'ranking' ? "Tìm kiếm phim..." : "Tìm kiếm theo slug phim..."}
                        className="w-full bg-surface-900 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none transition-all text-white placeholder-gray-500"
                    />
                </div>

                {/* Specific Ranking Sorting */}
                {subTab === 'ranking' && (
                    <div className="flex items-center gap-2 self-end md:self-auto">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sắp xếp theo:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="total">Tổng số lượt vote</option>
                            <option value="fire">🔥 Siêu Phẩm trước</option>
                            <option value="trash">🍅 Rác Phẩm trước</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Content Table */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : subTab === 'ranking' ? (
                /* ── TAB 1: RANKING MANAGEMENT ──────────────────────── */
                <div className="bg-surface-900 rounded-xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-surface-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest w-16">Poster</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Tên Phim</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest w-40">🔥 Siêu Phẩm</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest w-40">🍅 Rác Phẩm</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Năm</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Chất lượng</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest w-32">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {movies.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10 text-gray-500 italic">Không tìm thấy phim nào</td>
                                    </tr>
                                ) : (
                                    movies.map((movie) => {
                                        const isEditing = editingSlug === movie.slug;
                                        return (
                                            <tr key={movie._id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <div className="relative w-10 h-14 rounded-md overflow-hidden bg-black/40 border border-white/10">
                                                        <img
                                                            src={movie.thumb_url}
                                                            alt={movie.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{movie.name}</div>
                                                    <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate max-w-xs">{movie.slug}</div>
                                                </td>
                                                
                                                {/* FIRE COUNT */}
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={editFire}
                                                            onChange={(e) => setEditFire(Math.max(0, parseInt(e.target.value) || 0))}
                                                            className="w-20 bg-surface-950 border border-white/10 rounded-md text-center py-1 font-black text-orange-400 outline-none focus:border-primary"
                                                        />
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black">
                                                            🔥 {movie.fire_count || 0}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* TRASH COUNT */}
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={editTrash}
                                                            onChange={(e) => setEditTrash(Math.max(0, parseInt(e.target.value) || 0))}
                                                            className="w-20 bg-surface-950 border border-white/10 rounded-md text-center py-1 font-black text-red-400 outline-none focus:border-primary"
                                                        />
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black">
                                                            🍅 {movie.trash_count || 0}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-400 font-medium">
                                                    {movie.year}
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-white/5 rounded border border-white/10 text-gray-300">
                                                        {movie.quality}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleSaveCounts(movie.slug)}
                                                                disabled={saving}
                                                                className="h-8 px-2 bg-green-500 hover:bg-green-600 text-black border-none hover:text-black font-extrabold"
                                                            >
                                                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setEditingSlug(null)}
                                                                className="h-8 px-2 border-white/10 text-white hover:bg-white/5"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => startEditing(movie)}
                                                            className="h-8 px-3 border-white/10 text-gray-400 hover:text-white hover:bg-white/5 gap-1.5"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                            Sửa điểm
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ── TAB 2: VOTING LOGS (REACTION FEED) ─────────────── */
                <div className="bg-surface-900 rounded-xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-surface-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Người dùng</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Phim</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest w-40">Bình chọn</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Thời gian</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest w-24">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-gray-500 italic">Chưa có lượt bình chọn nào</td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log._id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={log.user?.avatar || '/default-avatar.png'}
                                                        alt={log.user?.displayName}
                                                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                                                    />
                                                    <div>
                                                        <div className="text-sm font-bold text-white">{log.user?.displayName || 'Người dùng ẩn danh'}</div>
                                                        <div className="text-[10px] text-gray-500 font-mono italic">{log.user?.email || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-primary font-mono">{log.movieSlug}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${log.type === 'fire' ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                                                    {log.type === 'fire' ? '🔥 Siêu Phẩm' : '🍅 Rác Phẩm'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                {new Date(log.createdAt).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteVote(log._id)}
                                                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-500 hover:bg-red-500/20 transition-all opacity-40 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Trước
                    </Button>
                    <span className="text-white text-sm">Trang {page} / {totalPages}</span>
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages}
                    >
                        Sau
                    </Button>
                </div>
            )}
        </div>
    );
}
