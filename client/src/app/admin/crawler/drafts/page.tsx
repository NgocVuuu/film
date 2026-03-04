'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface MovieDraft {
    _id: string;
    slug: string;
    name: string;
    origin_name: string;
    thumb_url: string;
    quality: string;
    year: number;
    torrents: {
        magnet: string;
        size: string;
        seeders: number;
        quality: string;
    }[];
    createdAt: string;
}

export default function DraftMoviesPage() {
    const { user } = useAuth();
    const [drafts, setDrafts] = useState<MovieDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isPublishing, setIsPublishing] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const fetchDrafts = useCallback(async (pageNum = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/drafts?page=${pageNum}&limit=20`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await res.json();
            if (result.success) {
                setDrafts(result.data);
                setTotalPages(result.pagination.totalPages);
                setPage(result.pagination.page);
            } else {
                toast.error(result.message || 'Lỗi tải danh sách phim nháp');
            }
        } catch (error) {
            toast.error('Lỗi kết nối server');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchDrafts(1);
        }
    }, [user, fetchDrafts]);

    const handlePublish = async (slug: string, name: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn DUYỆT LÊN WEB phim "${name}"? Khách hàng sẽ thấy phim này ngay lập tức.`)) return;

        try {
            setIsPublishing(slug);
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/drafts/${slug}/publish`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await res.json();

            if (result.success) {
                toast.success(result.message);
                fetchDrafts(page); // Reload current page
            } else {
                toast.error(result.message || 'Lỗi duyệtt phim');
            }
        } catch (error) {
            toast.error('Lỗi kết nối server');
        } finally {
            setIsPublishing(null);
        }
    };

    const handleDelete = async (slug: string, name: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN phim nháp "${name}" khỏi Spider Bot?`)) return;

        try {
            setIsDeleting(slug);
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/drafts/${slug}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await res.json();

            if (result.success) {
                toast.success('Đã xóa phim nháp');
                fetchDrafts(page); // Reload current page
            } else {
                toast.error(result.message || 'Lỗi xóa phim nháp');
            }
        } catch (error) {
            toast.error('Lỗi kết nối server');
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <RefreshCw className="w-8 h-8 text-yellow-500" />
                        Phim Cào Nháp (Spider Bot)
                    </h1>
                    <p className="text-gray-400 mt-2">Duyệt và xuất bản các bộ phim đã được Spider Bot tự động cào về.</p>
                </div>
                <Button onClick={() => fetchDrafts(page)} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Làm mới
                </Button>
            </div>

            {/* Alert info */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0 mt-1" />
                <div>
                    <h3 className="text-yellow-500 font-semibold mb-1">Cách Ly Nội Dung An Toàn (Sandboxing)</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Toàn bộ phim ở đây đang bị <strong>nhốt</strong> trong bảng <code>MovieDraft</code>. Người dùng trên web chưa thể nhìn thấy chúng.
                        Bấm <strong>Duyệt Lên Web</strong> sẽ tự động copy dữ liệu sang CSDL chính thức của pChill.
                    </p>
                </div>
            </div>

            {loading && drafts.length === 0 ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : drafts.length === 0 ? (
                <Card className="p-8 text-center bg-surface-900 border-white/10">
                    <p className="text-gray-400">Không có phim nháp nào đang chờ duyệt.</p>
                </Card>
            ) : (
                <div className="bg-surface-900 border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-black/20">
                                    <th className="p-4 text-sm font-semibold text-gray-300 w-24">Poster</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Thông tin phim</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Nguồn 4K (Magnet)</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300 w-64 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {drafts.map((draft) => (
                                    <tr key={draft._id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="relative w-16 h-24 rounded overflow-hidden bg-black">
                                                <img
                                                    src={draft.thumb_url}
                                                    alt={draft.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e: any) => { e.target.src = '/logo.png'; }}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-white text-lg">{draft.name}</div>
                                            <div className="text-sm text-gray-400 mb-2">{draft.origin_name}</div>
                                            <div className="flex gap-2 text-xs">
                                                <span className="bg-primary/20 text-primary px-2 py-1 rounded">{draft.quality}</span>
                                                <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">{draft.year}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            {draft.torrents?.length > 0 ? (
                                                <div className="space-y-1">
                                                    {draft.torrents.map((t, idx) => (
                                                        <div key={idx} className="bg-blue-500/10 border border-blue-500/20 p-2 rounded text-blue-400">
                                                            <div className="font-semibold">{t.quality} - {t.size}</div>
                                                            <div className="text-xs text-blue-400/70 truncate w-48" title={t.magnet}>
                                                                {t.magnet.substring(0, 30)}...
                                                            </div>
                                                            <div className="text-xs text-green-400 mt-1">
                                                                Seeders: {t.seeders}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-red-400">Chưa cào được link 4K</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    onClick={() => handleDelete(draft.slug, draft.name)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                    disabled={isDeleting === draft.slug || isPublishing === draft.slug}
                                                >
                                                    {isDeleting === draft.slug ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </Button>

                                                <Button
                                                    onClick={() => handlePublish(draft.slug, draft.name)}
                                                    className="bg-green-600 hover:bg-green-500 text-white gap-2"
                                                    disabled={isPublishing === draft.slug || isDeleting === draft.slug}
                                                >
                                                    {isPublishing === draft.slug ? (
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-4 h-4" />
                                                            Duyệt Lên Web
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-white/10 flex items-center justify-center gap-2 bg-black/20">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchDrafts(page - 1)}
                                disabled={page === 1}
                            >
                                Trước
                            </Button>
                            <span className="text-sm text-gray-400">
                                Trang {page} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchDrafts(page + 1)}
                                disabled={page === totalPages}
                            >
                                Sau
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
