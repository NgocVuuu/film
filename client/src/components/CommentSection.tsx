'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Star, Trash2, Send, ThumbsUp, MessageSquare, CornerDownRight } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { getAuthToken } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface User {
    _id: string;
    displayName: string;
    avatar: string;
    role: string;
}

interface Comment {
    _id: string;
    content: string;
    rating?: number;
    user: User;
    createdAt: string;
    parentId?: string;
    replies?: Comment[];
    likes?: string[];
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

    // Reply state
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');

    const fetchComments = async (pageNum = 1) => {
        try {
            const token = getAuthToken();
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_URL}/api/comments/${movieSlug}?page=${pageNum}&limit=10`, { // Increased limit
                credentials: 'include',
                headers
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

    const handleSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
        e.preventDefault();
        if (!user) {
            toast.error('Vui lòng đăng nhập để bình luận');
            return;
        }

        const contentToSubmit = parentId ? replyContent : newComment;
        const ratingToSubmit = parentId ? undefined : rating; // Replies don't have ratings

        if (!contentToSubmit.trim() || (!parentId && ratingToSubmit === 0 && !parentId)) {
            // Allow comments without rating? No, top level usually needs rating unless we changed that requirement.
            // Backend allows optional rating. Let's make rating mandatory for top-level reviews, optional for others if needed.
            // For now, let's keep rating mandatory for top-level reviews as it updates movie rating.
            if (!parentId && rating === 0) {
                toast.error('Vui lòng chọn đánh giá');
                return;
            }
        }

        setSubmitting(true);
        try {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    movieSlug,
                    content: contentToSubmit,
                    rating: ratingToSubmit,
                    parentId
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(parentId ? 'Đã trả lời!' : 'Đã gửi đánh giá!');
                if (parentId) {
                    setReplyContent('');
                    setReplyingTo(null);
                    // Manually insert reply to UI or refetch
                    // Refetch is easier but heavier. Let's refetch for consistency.
                    fetchComments(1);
                } else {
                    setNewComment('');
                    setRating(0);
                    fetchComments(1);
                }
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
            const token = getAuthToken();
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã xóa bình luận');
                fetchComments(1); // Refetch to clean up replies tree properly
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Lỗi khi xóa');
        }
    };

    const handleLike = async (commentId: string) => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để thích bình luận');
            return;
        }
        try {
            const token = getAuthToken();
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_URL}/api/comments/${commentId}/like`, {
                method: 'POST',
                credentials: 'include',
                headers
            });
            const data = await res.json();
            if (data.success) {
                // Update local state without refetching all
                setComments(prevComments => {
                    return prevComments.map(c => {
                        if (c._id === commentId) return { ...c, likes: data.likes };
                        // Also check replies
                        if (c.replies) {
                            const updatedReplies = c.replies.map(r =>
                                r._id === commentId ? { ...r, likes: data.likes } : r
                            );
                            return { ...c, replies: updatedReplies };
                        }
                        return c;
                    });
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const contentValid = () => newComment.trim().length > 0;

    const CommentItem = ({ comment, isReply = false }: { comment: Comment, isReply?: boolean }) => {
        const isLiked = user && comment?.likes?.includes(user._id || user.id || '');
        const likeCount = comment?.likes?.length || 0;

        return (
            <div className={`p-4 rounded-lg bg-surface-900/50 border border-white/5 flex gap-4 group hover:border-white/10 transition-colors ${isReply ? 'ml-12 border-l-2 border-l-white/10' : ''}`}>
                <div className="shrink-0">
                    <img
                        src={comment.user?.avatar || 'https://ui-avatars.com/api/?name=' + (comment.user?.displayName || 'User')}
                        alt={comment.user?.displayName}
                        className="w-10 h-10 rounded-full border border-white/10"
                    />
                </div>
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
                        {comment.rating && (
                            <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                <span className="text-xs font-bold text-yellow-500">{comment.rating}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line wrap-break-word mb-3">
                        {comment.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <button
                            onClick={() => handleLike(comment._id)}
                            className={`flex items-center gap-1 hover:text-primary transition-colors ${isLiked ? 'text-primary' : ''}`}
                        >
                            <ThumbsUp className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
                            {likeCount > 0 ? likeCount : 'Thích'}
                        </button>

                        {!isReply && user && (
                            <button
                                onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                                className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                                <MessageSquare className="w-3 h-3" /> Trả lời
                            </button>
                        )}

                        {(user && ((user.id === comment.user?._id || user._id === comment.user?._id) || user.role === 'admin')) && (
                            <button
                                onClick={() => handleDelete(comment._id)}
                                className="flex items-center gap-1 hover:text-red-400 transition-colors ml-auto"
                            >
                                <Trash2 className="w-3 h-3" /> Xóa
                            </button>
                        )}
                    </div>

                    {/* Reply Form */}
                    {replyingTo === comment._id && (
                        <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="shrink-0">
                                <CornerDownRight className="w-5 h-5 text-gray-500 ml-2" />
                            </div>
                            <div className="flex-1">
                                <form onSubmit={(e) => handleSubmit(e, comment._id)} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder={`Trả lời ${comment.user?.displayName}...`}
                                        className="flex-1 bg-surface-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                                        autoFocus
                                    />
                                    <Button size="sm" type="submit" disabled={!replyContent.trim() || submitting}>
                                        <Send className="w-3 h-3" />
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Star className="w-6 h-6 text-primary fill-current" />
                Đánh giá & Bình luận
            </h3>

            {/* Input Form (Top Level) */}
            <div className="bg-surface-800 p-6 rounded-xl border border-white/10">
                {!user ? (
                    <div className="text-center py-4">
                        <p className="text-gray-400 mb-2">Vui lòng đăng nhập để bình luận và đánh giá phim.</p>
                        <Button variant="outline" onClick={() => window.location.href = '/login'}>Đăng nhập ngay</Button>
                    </div>
                ) : (
                    <form onSubmit={(e) => handleSubmit(e, null)} className="space-y-4">
                        <div className="space-y-3">
                            <span className="block text-gray-300 font-medium text-sm md:text-base">Đánh giá của bạn:</span>
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex gap-1.5 md:gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                        >
                                            <Star
                                                className={`w-6 h-6 md:w-7 md:h-7 ${(hoverRating || rating) >= star ? 'text-yellow-500 fill-current' : 'text-gray-600'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                                {(hoverRating || rating) > 0 && (
                                    <span className="text-base md:text-lg font-bold text-yellow-500">
                                        {hoverRating || rating}/10
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Chia sẻ cảm nghĩ của bạn về bộ phim này..."
                                className="w-full bg-black/30 border border-white/10 rounded-lg p-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-25 resize-y"
                                maxLength={1000}
                            />
                            <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                                {newComment.length}/1000
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
                            <div key={comment._id} className="space-y-2">
                                <CommentItem comment={comment} />
                                {/* Render Replies */}
                                {comment.replies && comment.replies.map(reply => (
                                    <CommentItem key={reply._id} comment={reply} isReply={true} />
                                ))}
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
