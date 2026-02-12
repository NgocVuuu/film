'use client';
import { useState, useEffect } from 'react';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

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

    const fetchComments = async () => {
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
    };

    useEffect(() => {
        fetchComments();
    }, [page]);

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
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Quản lý Bình luận</h1>
            </div>

            <div className="bg-surface-900 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-surface-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Người dùng</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Nội dung</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Phim</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Ngày đăng</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Trạng thái</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {comments.map((comment) => (
                            <tr key={comment._id} className="hover:bg-surface-800/50">
                                <td className="px-4 py-3 text-sm text-white">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={comment.user.avatar || '/default-avatar.png'}
                                            alt={comment.user.displayName}
                                            className="w-8 h-8 rounded-full"
                                        />
                                        <div>
                                            <div className="font-medium">{comment.user.displayName}</div>
                                            <div className="text-xs text-gray-400">{comment.user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-300 max-w-md">
                                    {comment.content}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-400">
                                    {comment.movieSlug}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-400">
                                    {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {comment.isHidden ? (
                                        <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">Đã ẩn</span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">Hiển thị</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleHide(comment._id)}
                                        >
                                            {comment.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(comment._id)}
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
