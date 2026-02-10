'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Star, Trash2, Send } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { toast } from 'react-hot-toast';

interface Comment {
    _id: string;
    content: string;
    rating: number;
    user: {
        _id: string;
        displayName: string;
        avatar: string;
        role: string;
    };
    createdAt: string;
}

interface CommentSectionProps {
    movieSlug: string;
    onRatingChange?: (newRating: number, newCount: number) => void;
}

export function CommentSection({ movieSlug, onRatingChange }: CommentSectionProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchComments = async (pageNum = 1) => {
        try {
            const res = await fetch(`${API_URL}/api/comments/${movieSlug}?page=${pageNum}&limit=5`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                if (pageNum === 1) {
                    setComments(data.data);
                } else {
                    setComments(prev => [...prev, ...data.data]);
                }
                setTotalPages(data.pagination.totalPages);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments(1);
    }, [movieSlug]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error('Vui lòng đăng nhập để bình luận');
            return;
        }
        if (!contentValid() || rating === 0) {
            toast.error('Vui lòng nhập nội dung và chọn đánh giá');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    movieSlug,
                    content: newComment,
                    rating
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã gửi bình luận!');
                setNewComment('');
                setRating(0);
                // Refresh comments
                fetchComments(1);
                // Ideally update parent rating state too via callback, but need logic for that
            } else {
                toast.error(data.message || 'Lỗi khi gửi bình luận');
            }
        } catch (error) {
            toast.error('Lỗi kết nối');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
        try {
            const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã xóa bình luận');
                setComments(comments.filter(c => c._id !== commentId));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Lỗi khi xóa');
        }
    };

    const contentValid = () => newComment.trim().length > 0;

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Star className="w-6 h-6 text-primary fill-current" />
                Đánh giá & Bình luận
            </h3>

            {/* Input Form */}
            <div className="bg-surface-800 p-6 rounded-xl border border-white/10">
                {!user ? (
                    <div className="text-center py-4">
                        <p className="text-gray-400 mb-2">Vui lòng đăng nhập để bình luận và đánh giá phim.</p>
                        <Button variant="outline" onClick={() => window.location.href = '/login'}>Đăng nhập ngay</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Rating Stars */}
                        <div className="flex items-center gap-2">
                            <span className="text-gray-300 font-medium mr-2">Đánh giá của bạn:</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`w-5 h-5 ${(hoverRating || rating) >= star ? 'text-yellow-500 fill-current' : 'text-gray-600'
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <span className="text-sm font-bold text-yellow-500 ml-2">
                                {hoverRating || rating > 0 ? `${hoverRating || rating}/10` : ''}
                            </span>
                        </div>

                        {/* Text Area */}
                        <div className="relative">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Chia sẻ cảm nghĩ của bạn về bộ phim này..."
                                className="w-full bg-black/30 border border-white/10 rounded-lg p-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[100px] resize-y"
                                maxLength={500}
                            />
                            <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                                {newComment.length}/500
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={submitting || !contentValid() || rating === 0}
                                className="bg-primary hover:bg-gold-600 text-black font-bold"
                            >
                                {submitting ? 'Đang gửi...' : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" /> Gửi đánh giá
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            {/* Comments List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-500 animate-pulse">Đang tải bình luận...</div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-surface-900/30 rounded-lg border border-dashed border-white/10">
                        Chưa có bình luận nào. Hãy là người đầu tiên đánh giá!
                    </div>
                ) : (
                    <>
                        {comments.map((comment) => (
                            <div key={comment._id} className="bg-surface-900/50 p-4 rounded-lg border border-white/5 flex gap-4 group hover:border-white/10 transition-colors">
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    <img
                                        src={comment.user?.avatar || 'https://ui-avatars.com/api/?name=User'}
                                        alt={comment.user?.displayName}
                                        className="w-10 h-10 rounded-full border border-white/10"
                                    />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-sm">
                                                {comment.user?.displayName || 'Người dùng ẩn danh'}
                                            </span>
                                            {comment.user?.role === 'admin' && (
                                                <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border border-red-500/20">
                                                    Admin
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-500">
                                                • {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                        {/* Rating Badge */}
                                        <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                            <span className="text-xs font-bold text-yellow-500">{comment.rating}</span>
                                        </div>
                                    </div>

                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line break-words">
                                        {comment.content}
                                    </p>

                                    {/* Action buttons (Delete) */}
                                    {(user && ((user.id === comment.user?._id || user._id === comment.user?._id) || user.role === 'admin')) && (
                                        <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDelete(comment._id)}
                                                className="text-gray-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" /> Xóa
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Load More */}
                        {page < totalPages && (
                            <div className="text-center pt-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => fetchComments(page + 1)}
                                    className="text-primary hover:text-white hover:bg-white/10"
                                >
                                    Xem thêm bình luận cũ hơn
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
