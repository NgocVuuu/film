'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Star, Trash2, Send, ThumbsUp, MessageSquare, CornerDownRight, MessageCircle } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { getAuthToken } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

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
    episodeName?: string;
    user: User;
    createdAt: string;
    parentId?: string;
    replies?: Comment[];
    likes?: string[];
}

interface CommentSectionProps {
    movieSlug: string;
    episodeName?: string;
    hideRatingForm?: boolean;
    formPosition?: 'top' | 'bottom';
    onlyWithRating?: boolean;
    hideForm?: boolean;
    compactInput?: boolean;
}

export function CommentSection({ 
    movieSlug, 
    episodeName, 
    hideRatingForm = false,
    formPosition = 'top',
    onlyWithRating = false,
    hideForm = false,
    compactInput = false
}: CommentSectionProps) {
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
            // Add rating filter if onlyWithRating is true
            const url = `${API_URL}/api/comments/${movieSlug}?page=${pageNum}&limit=10${onlyWithRating ? '&hasRating=true' : ''}`;
            const res = await fetch(url, {
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
        setLoading(true);
        fetchComments(1);
    }, [movieSlug, onlyWithRating]);

    const handleSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
        e.preventDefault();
        if (!user) {
            toast.error('Vui lòng đăng nhập để bình luận');
            return;
        }

        const contentToSubmit = parentId ? replyContent : newComment;
        const ratingToSubmit = parentId || hideRatingForm ? undefined : (rating > 0 ? rating : undefined);

        if (!contentToSubmit.trim()) {
            toast.error('Vui lòng nhập nội dung bình luận');
            return;
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
                    parentId,
                    episodeName: parentId ? undefined : episodeName
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(parentId ? 'Đã trả lời!' : 'Đã gửi!');
                if (parentId) {
                    setReplyContent('');
                    setReplyingTo(null);
                    fetchComments(1);
                } else {
                    setNewComment('');
                    setRating(0);
                    fetchComments(1);
                }
            } else {
                toast.error(data.message || 'Lỗi khi gửi bình luận');
            }
        } catch {
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
                fetchComments(1);
            } else {
                toast.error(data.message);
            }
        } catch {
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
                setComments(prevComments => {
                    return prevComments.map(c => {
                        if (c._id === commentId) return { ...c, likes: data.likes };
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

    const contentValid = () => {
        const hasText = newComment.trim().length > 0;
        if (onlyWithRating) {
            return hasText && rating > 0;
        }
        return hasText;
    };

    const CommentItem = ({ comment, isReply = false }: { comment: Comment, isReply?: boolean }) => {
        const isLiked = user && comment?.likes?.includes(user._id || user.id || '');
        const likeCount = comment?.likes?.length || 0;

        return (
            <div className={cn(
                "p-2.5 md:p-5 rounded-2xl bg-surface-900/40 border border-white/5 flex gap-2.5 md:gap-4 group hover:border-white/20 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300",
                isReply ? 'ml-4 md:ml-14 border-l-2 border-l-white/10' : ''
            )}>
                <div className="shrink-0">
                    <div className="relative">
                        <img
                            src={comment.user?.avatar || 'https://ui-avatars.com/api/?name=' + (comment.user?.displayName || 'User')}
                            alt={comment.user?.displayName}
                            className="w-8 h-8 md:w-12 md:h-12 rounded-full border border-white/10 shadow-lg"
                        />
                        {comment.user?.role === 'admin' && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center" title="Admin">
                                <Star className="w-2 h-2 text-white fill-current" />
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-[13px] md:text-base tracking-tight">
                                {comment.user?.displayName || 'Người dùng ẩn danh'}
                            </span>
                            <span className="text-[9px] md:text-xs text-gray-500 font-medium">
                                {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                        {comment.rating && (
                            <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20 shadow-sm shadow-yellow-500/5">
                                <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-500 fill-current" />
                                <span className="text-[10px] md:text-sm font-extrabold text-yellow-500">{comment.rating}</span>
                            </div>
                        )}
                    </div>

                    <div className="text-gray-300 text-[13px] md:text-[15px] leading-relaxed whitespace-pre-line break-words mb-2 md:mb-3 font-normal opacity-90">
                        {comment.content}
                    </div>

                    <div className="flex items-center gap-4 text-[9px] md:text-[12px] text-gray-500 font-medium">
                        <button
                            onClick={() => handleLike(comment._id)}
                            className={cn(
                                "flex items-center gap-1.5 hover:text-primary transition-all active:scale-90",
                                isLiked ? 'text-primary' : ''
                            )}
                        >
                            <ThumbsUp className={cn("w-3 h-3 md:w-4 md:h-4", isLiked ? 'fill-current' : '')} />
                            <span className="hidden md:inline">{likeCount > 0 ? `${likeCount} Thích` : 'Thích'}</span>
                            <span className="md:hidden">{likeCount > 0 ? likeCount : 'Thích'}</span>
                        </button>

                        {!isReply && (
                            <button
                                onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                                className="flex items-center gap-1.5 hover:text-white transition-all active:scale-90"
                            >
                                <MessageSquare className="w-3 h-3 md:w-4 md:h-4" /> Trả lời
                            </button>
                        )}

                        {(user && ((user.id === comment.user?._id || user._id === comment.user?._id) || user.role === 'admin')) && (
                            <button
                                onClick={() => handleDelete(comment._id)}
                                className="flex items-center gap-1.5 hover:text-red-400 transition-all active:scale-90 ml-auto"
                            >
                                <Trash2 className="w-3 h-3 md:w-4 md:h-4" /> Xóa
                            </button>
                        )}
                    </div>

                    {/* Reply Form */}
                    {replyingTo === comment._id && (
                        <div className="mt-4 flex gap-2 animate-in fade-in slide-in-from-top-2">
                             <div className="shrink-0 pt-2">
                                <CornerDownRight className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex-1">
                                <form onSubmit={(e) => handleSubmit(e, comment._id)} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder={`Trả lời ${comment.user?.displayName}...`}
                                        className="flex-1 bg-surface-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
                                        autoFocus
                                    />
                                    <Button size="sm" type="submit" className="rounded-xl h-8 px-3" disabled={!replyContent.trim() || submitting}>
                                        <Send className="w-3.5 h-3.5" />
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const RenderForm = () => {
        if (hideForm) return null;
        if (onlyWithRating && hideRatingForm) return null; 
        
        if (compactInput) {
            return (
                <div className={cn("bg-surface-800/90 p-3 rounded-2xl border border-white/5 backdrop-blur-xl", formPosition === 'top' && "mb-4")}>
                   {!user ? (
                        <div className="text-center py-2">
                            <p className="text-gray-400 text-[10px] mb-2">Vui lòng đăng nhập để bình luận.</p>
                            <Button variant="outline" size="sm" className="rounded-xl h-7 text-[10px]" onClick={() => window.location.href = '/login'}>Đăng nhập ngay</Button>
                        </div>
                    ) : (
                        <form onSubmit={(e) => handleSubmit(e, null)} className="space-y-3">
                            {!hideRatingForm && (
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider">Đánh giá của bạn:</span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    className="focus:outline-none transition-transform active:scale-90"
                                                >
                                                    <Star
                                                        className={cn("w-3.5 h-3.5", (hoverRating || rating) >= star ? 'text-yellow-500 fill-current' : 'text-gray-700')}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Chia sẻ cảm nghĩ..."
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[12px] text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/10 outline-none min-h-[40px] max-h-[100px] resize-none transition-all"
                                        rows={1}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={submitting || !contentValid()}
                                    className="bg-primary hover:bg-gold-600 text-black p-0 w-10 h-10 rounded-xl shrink-0"
                                    title={onlyWithRating ? "Gửi đánh giá" : "Gửi bình luận"}
                                >
                                    {submitting ? (
                                        <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            )
        }

        return (
            <div className={cn("bg-surface-800/80 p-3.5 rounded-[2rem] border border-white/10 backdrop-blur-md", formPosition === 'bottom' ? 'mb-4 shadow-2xl' : '')}>
                {!user ? (
                    <div className="text-center py-3">
                        <p className="text-gray-400 text-[11px] mb-2">Vui lòng đăng nhập để bình luận.</p>
                        <Button variant="outline" size="sm" className="rounded-xl h-8 text-[11px]" onClick={() => window.location.href = '/login'}>Đăng nhập ngay</Button>
                    </div>
                ) : (
                    <form onSubmit={(e) => handleSubmit(e, null)} className="space-y-3">
                        {!hideRatingForm && (
                            <div className="space-y-2">
                                <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider">Đánh giá của bạn:</span>
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="focus:outline-none transition-transform active:scale-95"
                                            >
                                                <Star
                                                    className={cn("w-4.5 h-4.5", (hoverRating || rating) >= star ? 'text-yellow-500 fill-current' : 'text-gray-700')}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    {(hoverRating || rating) > 0 && (
                                        <span className="text-[11px] font-extrabold text-yellow-500">
                                            {hoverRating || rating}/5
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="relative group">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Chia sẻ cảm nghĩ của bạn..."
                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 text-[12px] text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none min-h-[80px] md:min-h-[100px] resize-none transition-all"
                                maxLength={1000}
                            />
                            <div className="absolute bottom-2 right-3 text-[9px] font-bold text-gray-600">
                                {newComment.length}/1000
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={submitting || !contentValid()}
                                className="bg-primary hover:bg-gold-600 text-black font-extrabold px-5 rounded-xl h-9 text-xs"
                            >
                                {submitting ? (onlyWithRating ? 'Đang gửi đánh giá...' : 'Đang gửi...') : (
                                    <>
                                        <Send className="w-3.5 h-3.5 mr-1.5" /> {onlyWithRating ? 'GỬI ĐÁNH GIÁ' : 'GỬI BÌNH LUẬN'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Comment list container that stretches */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                <div className="flex flex-col gap-6 p-4 md:p-0">
                    {!hideForm && formPosition === 'top' && <RenderForm />}

                    {/* Comments List */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-12">
                                 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                 <p className="text-gray-500 text-sm font-medium">Đang tải dữ liệu...</p>
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="text-center py-8 md:py-16 px-6 bg-surface-900/30 rounded-3xl border border-dashed border-white/10">
                                <MessageSquare className="w-10 h-10 md:w-12 md:h-12 text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-400 text-xs md:text-sm font-medium">Chưa có dữ liệu nào ở đây.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <div key={comment._id} className="space-y-4">
                                        <CommentItem comment={comment} />
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
                                            className="text-primary hover:text-white hover:bg-white/10 font-bold text-xs uppercase"
                                        >
                                            Xem thêm cũ hơn
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!hideForm && formPosition === 'bottom' && (
                <div className={cn(
                    "shrink-0",
                    compactInput ? "px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                )}>
                    <RenderForm />
                </div>
            )}
        </div>
    );
}
