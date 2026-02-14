'use client';
import { useState, useEffect, useCallback } from 'react';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface Comment {
    _id: string;
    content: string;
    movieSlug: string;
    isHidden: boolean;
    user: {
        displayName: string;
        email: string;
        avatar?: string;
    };
    createdAt: string;
}

export default function AdminCommentsPage() {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true);
            const res = await customFetch(`/api/admin/comments?page=${page}&limit=20`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                setComments(data.data);
                setTotalPages(data.pagination.totalPages);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Fetch comments error:', error);
            toast.error('Lỗi khi tải bình luận');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleToggleHide = async (commentId: string) => {
        try {
            const res = await customFetch(`/api/admin/comments/${commentId}/hide`, {
                method: 'PATCH',
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                toast.success(data.message);
                fetchComments();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Toggle hide error:', error);
            toast.error('Lỗi khi cập nhật');
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;

        try {
            const res = await customFetch(`/api/admin/comments/${commentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                toast.success(data.message);
                fetchComments();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Delete comment error:', error);
            toast.error('Lỗi khi xóa bình luận');
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Quản lý Bình luận</h1>
            </div>

            <div className="bg-surface-900 rounded-xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                    <table className="w-full min-w-[1000px]">
                        <thead className="bg-surface-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Người dùng</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Nội dung</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Phim</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Ngày đăng</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Trạng thái</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {comments.map((comment) => (
                                <tr key={comment._id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-8 h-8 shrink-0">
                                                <Image
                                                    src={comment.user.avatar || '/default-avatar.png'}
                                                    alt={comment.user.displayName}
                                                    fill
                                                    sizes="32px"
                                                    className="rounded-full object-cover border border-white/10"
                                                />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{comment.user.displayName}</div>
                                                <div className="text-[10px] text-gray-500 font-mono italic">{comment.user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-300 max-w-xs md:max-w-md line-clamp-2 italic">"{comment.content}"</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-xs text-primary font-medium hover:underline cursor-pointer">{comment.movieSlug}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {comment.isHidden ? (
                                            <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20 rounded">Bị ẩn</span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-green-500/10 text-green-500 border border-green-500/20 rounded">Hiện</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-9 w-9 p-0 hover:bg-white/10 ${comment.isHidden ? 'text-green-500' : 'text-gray-400'}`}
                                                onClick={() => handleToggleHide(comment._id)}
                                                title={comment.isHidden ? 'Show Comment' : 'Hide Comment'}
                                            >
                                                {comment.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-9 p-0 text-gray-500 hover:bg-red-500/20 hover:text-red-500"
                                                onClick={() => handleDelete(comment._id)}
                                                title="Delete Comment"
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
