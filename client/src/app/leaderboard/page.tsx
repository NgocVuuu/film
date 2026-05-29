'use client';
import { useEffect, useState } from 'react';
import { Trophy, Clock, Medal, Crown, Star } from 'lucide-react';
import { customFetch } from '@/lib/api';

interface LeaderboardUser {
    _id: string;
    isGuest: boolean;
    displayName: string;
    avatar: string | null;
    totalWatchTimeSeconds: number;
    createdAt?: string;
    role?: string;
}

export default function LeaderboardPage() {
    const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [stars, setStars] = useState<{ top: string, left: string, size: string, delay: string, duration: string }[]>([]);

    useEffect(() => {
        setStars(Array.from({ length: 25 }).map(() => ({
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            size: `${Math.random() * 1 + 0.5}rem`,
            delay: `${Math.random() * 2}s`,
            duration: `${Math.random() * 3 + 2}s`
        })));
    }, []);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const res = await customFetch(`/api/users/leaderboard?limit=50&period=${period}`);
                const data = await res.json();
                if (data.success) {
                    setUsers(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [period]);

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours} giờ ${minutes} phút`;
        return `${minutes} phút`;
    };

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />;
        if (index === 1) return <Medal className="w-7 h-7 text-gray-300 drop-shadow-[0_0_6px_rgba(209,213,219,0.8)]" />;
        if (index === 2) return <Medal className="w-6 h-6 text-amber-600 drop-shadow-[0_0_4px_rgba(217,119,6,0.8)]" />;
        return <span className="text-gray-500 font-bold w-6 text-center text-lg">{index + 1}</span>;
    };

    const getRankColor = (index: number) => {
        if (index === 0) return 'bg-gradient-to-r from-yellow-500/20 via-yellow-500/5 to-transparent border-yellow-500/50 shadow-[0_0_20px_rgba(250,204,21,0.2)] z-10 scale-[1.03] ring-1 ring-yellow-400/30';
        if (index === 1) return 'bg-gradient-to-r from-gray-300/20 via-gray-300/5 to-transparent border-gray-300/40 shadow-[0_0_15px_rgba(209,213,219,0.15)] z-10 scale-[1.01] ring-1 ring-gray-300/30';
        if (index === 2) return 'bg-gradient-to-r from-amber-600/20 via-amber-600/5 to-transparent border-amber-600/40 shadow-[0_0_10px_rgba(217,119,6,0.15)] z-10 ring-1 ring-amber-600/30';
        return 'bg-surface-900 border-white/5 text-gray-400 hover:bg-surface-800';
    };

    return (
        <div className="min-h-screen bg-black text-white pt-14 md:pt-20 pb-12 relative overflow-hidden">
            {/* Background Glowing Blobs (Hidden on mobile to save GPU) */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 hidden md:block"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-yellow-500/10 blur-[150px] rounded-full pointer-events-none translate-x-1/3 translate-y-1/3 hidden md:block"></div>

            {/* Animated Stars Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {stars.map((star, i) => (
                    <Star
                        key={i}
                        className="absolute text-yellow-500/20 animate-pulse drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]"
                        style={{
                            top: star.top,
                            left: star.left,
                            width: star.size,
                            height: star.size,
                            animationDelay: star.delay,
                            animationDuration: star.duration
                        }}
                    />
                ))}
            </div>

            <div className="container mx-auto px-4 max-w-4xl relative z-10">
                <div className="flex flex-col items-center mb-6 md:mb-10 text-center">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-primary/10 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 border border-primary/20 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)] relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent rounded-2xl md:rounded-3xl animate-pulse"></div>
                        <Trophy className="w-7 h-7 md:w-10 md:h-10 text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black mb-2 md:mb-3 bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] py-4 leading-normal">
                        BẢNG XẾP HẠNG
                    </h1>
                    <p className="text-gray-400 max-w-lg text-sm md:text-base">
                        Vinh danh những PChiller cày phim nhiệt huyết nhất. Đăng nhập để lưu danh trên bảng vàng!
                    </p>
                </div>

                <div className="bg-surface-900/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-4 md:p-8 shadow-2xl relative overflow-hidden">
                    {/* Subtle top glare */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                    {/* Tabs */}
                    <div className="flex justify-center mb-8">
                        <div className="flex bg-black/40 rounded-2xl p-1.5 border border-white/5 backdrop-blur-md">
                            <button
                                onClick={() => setPeriod('week')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${period === 'week' ? 'bg-primary text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                Tuần này
                            </button>
                            <button
                                onClick={() => setPeriod('month')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${period === 'month' ? 'bg-primary text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                Tháng này
                            </button>
                            <button
                                onClick={() => setPeriod('all')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${period === 'all' ? 'bg-primary text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                Tất cả
                            </button>
                        </div>
                    </div>

                    {/* Leaderboard List */}
                    <div className="space-y-3">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse border border-white/5"></div>
                            ))
                        ) : users.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Trophy className="w-16 h-16 text-gray-600 mb-4 opacity-50" />
                                <p className="text-gray-400 text-lg font-medium">Chưa có ai ghi danh bảng vàng</p>
                                <p className="text-gray-600 text-sm mt-1">Hãy là người đầu tiên lọt top nhé!</p>
                            </div>
                        ) : (
                            users.map((user, index) => (
                                <div
                                    key={user._id}
                                    className={`relative p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-300 flex items-center justify-between ${getRankColor(index)}`}
                                >
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <div className="w-6 md:w-8 flex justify-center">{getRankIcon(index)}</div>
                                        <img
                                            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user._id}&backgroundColor=b6e3f4`}
                                            alt={user.displayName}
                                            className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 bg-surface-800 object-cover shadow-inner ${index === 0 ? 'border-yellow-400' : index === 1 ? 'border-gray-300' : index === 2 ? 'border-amber-600' : 'border-white/10'}`}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-bold text-base truncate ${index < 3 ? 'text-white' : 'text-gray-200'}`}>
                                                {user.displayName}
                                            </h3>
                                            {user.isGuest && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 shrink-0 border border-white/5 font-medium tracking-wide">Ẩn danh</span>
                                            )}
                                            {user.role === 'admin' && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0 font-medium tracking-wide">Admin</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs mt-1.5 opacity-80">
                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-400 font-medium tracking-wide">Đã cày phim <span className="text-white">{formatTime(user.totalWatchTimeSeconds)}</span></span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
