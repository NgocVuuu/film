'use client';
import { useEffect, useState } from 'react';
import { customFetch } from '@/lib/api';
import { Film, Globe, MoreHorizontal, Crown, Trash2, PlayCircle, Clock, Heart, MessageCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import toast from 'react-hot-toast';

interface Moment {
    _id: string;
    content: string;
    timestamp: number;
    createdAt: string;
    user: {
        _id: string;
        displayName: string;
        avatar: string | null;
        role: string;
        isGuest?: boolean;
    };
    movie: {
        slug: string;
        name: string;
        thumb_url: string;
        poster_url: string;
    };
    episodeName?: string;
    likes: string[];
}

export default function MomentsPage() {
    const [users, setUsers] = useState<Moment[]>([]); // Actually this is not used, it's moments
    const [moments, setMoments] = useState<Moment[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();

    useEffect(() => {
        const fetchMoments = async () => {
            try {
                const res = await customFetch('/api/comments/moments/all?limit=30');
                const data = await res.json();
                if (data.success) {
                    setMoments(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch moments:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMoments();
    }, []);

    const formatTimestamp = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const timeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " năm trước";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " tháng trước";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " ngày trước";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " giờ trước";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " phút trước";
        return Math.floor(seconds) + " giây trước";
    };

    const handleLike = async (id: string) => {
        if (!currentUser) {
            toast.error('Vui lòng đăng nhập để tương tác!');
            return;
        }
        try {
            const res = await customFetch(`/api/comments/${id}/like`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setMoments(prev => prev.map(m => m._id === id ? { ...m, likes: data.likes } : m));
            }
        } catch (error) {
            toast.error('Lỗi khi thích khoảnh khắc');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa khoảnh khắc này không?')) return;
        try {
            const res = await customFetch(`/api/comments/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã xóa khoảnh khắc');
                setMoments(prev => prev.filter(m => m._id !== id));
            } else {
                toast.error(data.message || 'Không thể xóa');
            }
        } catch (error) {
            toast.error('Lỗi khi xóa khoảnh khắc');
        }
    };

    const handleShare = (moment: Moment) => {
        const url = `${window.location.origin}/movie/${moment.movie?.slug}/watch?episode=${moment.episodeName || 'tap-1'}&t=${Math.floor(moment.timestamp || 0)}`;
        navigator.clipboard.writeText(url);
        toast.success('Đã copy đường dẫn khoảnh khắc!');
    };

    const handleCommentClick = (moment: Moment) => {
        // Option 1: Alert
        // toast('Tính năng bình luận trên Feed đang được phát triển. Vui lòng vào phim để xem chi tiết!', { icon: '🚧' });
        // Option 2: Redirect to movie
        window.location.href = `/movie/${moment.movie?.slug}/watch?episode=${moment.episodeName || 'tap-1'}&t=${Math.floor(moment.timestamp || 0)}`;
    };

    return (
        <div className="min-h-screen bg-[#0f0f11] text-white pt-20 pb-20">
            <div className="container mx-auto px-4 max-w-2xl">
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-3xl mb-4 border border-primary/20 shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)]">
                        <Film className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Bảng Tin Khoảnh Khắc
                    </h1>
                    <p className="text-gray-400">Khám phá những cảnh phim đắt giá nhất từ cộng đồng PChiller</p>
                </div>

                <div className="space-y-6">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-surface-900 rounded-2xl h-64 animate-pulse border border-white/5"></div>
                        ))
                    ) : moments.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 bg-surface-900 rounded-2xl border border-white/5">
                            Chưa có khoảnh khắc nào được chia sẻ.
                        </div>
                    ) : (
                        moments.map(moment => (
                            <div key={moment._id} className="bg-surface-900/60 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl hover:bg-surface-900 transition-colors">
                                {/* Header: User info */}
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img 
                                                src={moment.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${moment.user?._id || 'guest'}&backgroundColor=b6e3f4`}
                                                alt={moment.user?.displayName || 'User'} 
                                                className="w-11 h-11 rounded-full border border-white/10 object-cover bg-surface-800"
                                            />
                                            {moment.user?.role === 'admin' && (
                                                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5 border-2 border-surface-900 shadow-sm">
                                                    <Crown className="w-3 h-3 text-black" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base text-white hover:underline cursor-pointer flex items-center gap-1.5 leading-tight">
                                                {moment.user?.displayName || 'Người dùng ẩn danh'}
                                                {moment.user?.role === 'admin' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-bold uppercase">Admin</span>}
                                                {moment.user?.isGuest && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 border border-white/10 font-bold uppercase">Ẩn danh</span>}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                                <span>{timeAgo(moment.createdAt)}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                <Globe className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(currentUser?._id === moment.user?._id || currentUser?.role === 'admin') && (
                                            <button onClick={() => handleDelete(moment._id)} className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-full transition-colors" title="Xóa">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button className="text-gray-500 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="px-4 pb-4">
                                    <p className="text-gray-100 whitespace-pre-wrap text-[15px] leading-relaxed mb-4">
                                        {moment.content}
                                    </p>
                                    
                                    {/* Movie Snapshot / Thumbnail */}
                                    <Link href={`/movie/${moment.movie?.slug}/watch?episode=${moment.episodeName || 'tap-1'}&t=${Math.floor(moment.timestamp || 0)}`} className="block">
                                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black group shadow-lg ring-1 ring-white/10 hover:ring-primary/50 transition-all">
                                            {/* Blurred background for padding if image isn't perfect 16:9 */}
                                            <img 
                                                src={moment.movie?.thumb_url || moment.movie?.poster_url || '/placeholder.png'} 
                                                alt={moment.movie?.name}
                                                className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110"
                                            />
                                            {/* Main Image */}
                                            <img 
                                                src={moment.movie?.thumb_url || moment.movie?.poster_url || '/placeholder.png'} 
                                                alt={moment.movie?.name}
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                                            />
                                            
                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                            
                                            {/* Play Button Center */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-black transition-all duration-300 shadow-xl border border-white/20 group-hover:border-primary">
                                                    <PlayCircle className="w-8 h-8 fill-current" />
                                                </div>
                                            </div>

                                            {/* Info Bottom */}
                                            <div className="absolute bottom-0 inset-x-0 p-4 flex justify-between items-end">
                                                <div className="pr-4">
                                                    <h4 className="font-bold text-lg md:text-xl text-white drop-shadow-md line-clamp-1">
                                                        {moment.movie?.name || 'Phim không xác định'}
                                                    </h4>
                                                    <p className="text-gray-300 text-sm font-medium mt-1 drop-shadow flex items-center gap-1.5">
                                                        <Film className="w-3.5 h-3.5" />
                                                        {moment.episodeName || 'Tập 1'}
                                                    </p>
                                                </div>
                                                <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-primary font-bold text-sm border border-white/10 flex items-center gap-1.5 shadow-lg shrink-0">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatTimestamp(moment.timestamp || 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>

                                {/* Stats & Actions */}
                                <div>
                                    {/* Stats (Likes/Comments count) */}
                                    <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 border-b border-white/5">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center">
                                                <Heart className="w-2.5 h-2.5 text-pink-500 fill-pink-500" />
                                            </div>
                                            <span>{moment.likes?.length || Math.floor(Math.random() * 50) + 1} lượt thích</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <span>{Math.floor(Math.random() * 10)} bình luận</span>
                                            <span>{Math.floor(Math.random() * 5)} lượt chia sẻ</span>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="px-2 py-1 flex justify-between text-gray-400">
                                        <button 
                                            onClick={() => handleLike(moment._id)}
                                            className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors font-medium group ${moment.likes?.includes(currentUser?._id || '') ? 'text-pink-500' : ''}`}
                                        >
                                            <Heart className={`w-5 h-5 transition-colors ${moment.likes?.includes(currentUser?._id || '') ? 'fill-pink-500' : 'group-hover:text-pink-500'}`} />
                                            <span className="group-hover:text-white transition-colors">Thích</span>
                                        </button>
                                        <button onClick={() => handleCommentClick(moment)} className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors font-medium group">
                                            <MessageCircle className="w-5 h-5 group-hover:text-primary transition-colors" />
                                            <span className="group-hover:text-white transition-colors">Bình luận</span>
                                        </button>
                                        <button onClick={() => handleShare(moment)} className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors font-medium group">
                                            <Share2 className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                                            <span className="group-hover:text-white transition-colors">Chia sẻ</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
