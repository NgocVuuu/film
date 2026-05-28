'use client';
import { useEffect, useState } from 'react';
import { Users, CreditCard, Film, TrendingUp, Loader2, Eye, UserPlus, Activity, RefreshCw, AlertTriangle, MonitorPlay, Zap, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';

interface Movie {
    name: string;
    slug: string;
    thumb_url: string;
    view: number;
    type: string;
}

interface TrendData {
    date: string;
    views?: number;
    users?: number;
}

interface DashboardStats {
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    newUsersLast7Days: number;
    newUsersThisMonth: number;
    activeUsers: number;
    totalMovies: number;
    totalWatchProgress: number;
    topMovies: Movie[];
    viewTrends: TrendData[];
    userTrends: TrendData[];
    tracking?: {
        pendingReports: number;
        pending4kRequests: number;
        pendingMovieRequests: number;
        pendingUpgradeRequests: number;
        systemTracking: {
            uptime: number;
            memory: {
                heapUsed: number;
                rss: number;
            };
        };
    };
}

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

// ... (keep existing interfaces except TrendData might need adjustment if not compatible)

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [hostRevenue, setHostRevenue] = useState<{ play4me?: any, seekstreaming?: any } | null>(null);

    useEffect(() => {
        fetchStats();
        fetchHostRevenue();
    }, []);

    const fetchHostRevenue = async () => {
        try {
            const response = await customFetch(`/api/admin/host-revenue`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setHostRevenue(data.data);
            }
        } catch (error) {
            console.error('Fetch host revenue error:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await customFetch(`/api/admin/stats`, {
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            } else {
                toast.error(data.message || 'Lỗi khi tải thống kê');
            }
        } catch (error) {
            console.error('Fetch stats error:', error);
            toast.error('Lỗi khi tải thống kê');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const clearTmdbCache = async () => {
        try {
            const res = await customFetch('/api/admin/cache/clear-tmdb', { method: 'POST', credentials: 'include' });
            const data = await res.json();
            if (data.success) toast.success('Đã xóa cache TMDB — trending sẽ cập nhật ngay!');
            else toast.error(data.message || 'Lỗi xóa cache');
        } catch {
            toast.error('Lỗi kết nối server');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    const maxViews = Math.max(...(stats?.topMovies.map(m => m.view) || [1]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-surface-800 border border-white/10 p-3 rounded shadow-xl">
                    <p className="text-white font-medium mb-1">{new Date(label).toLocaleDateString('vi-VN')}</p>
                    <p className="text-primary text-sm">
                        {payload[0].name}: {formatNumber(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Users */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Users className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-sm text-green-400">
                            +{stats?.newUsersLast7Days || 0} (7d)
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {formatNumber(stats?.totalUsers || 0)}
                    </h3>
                    <p className="text-gray-400 text-sm">Total Users</p>
                </div>

                {/* Active Users */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <Activity className="w-6 h-6 text-green-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {formatNumber(stats?.activeUsers || 0)}
                    </h3>
                    <p className="text-gray-400 text-sm">Active Users (7d)</p>
                </div>

                {/* New Users This Month */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                            <UserPlus className="w-6 h-6 text-purple-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {formatNumber(stats?.newUsersThisMonth || 0)}
                    </h3>
                    <p className="text-gray-400 text-sm">New Users (Month)</p>
                </div>

                {/* Active Subscriptions */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <CreditCard className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {formatNumber(stats?.activeSubscriptions || 0)}
                    </h3>
                    <p className="text-gray-400 text-sm">Active Subscriptions</p>
                </div>

                {/* Total Revenue */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {formatCurrency(stats?.totalRevenue || 0)}
                    </h3>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                </div>

                {/* Total Movies */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                            <Film className="w-6 h-6 text-purple-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {formatNumber(stats?.totalMovies || 0)}
                    </h3>
                    <p className="text-gray-400 text-sm">Total Movies</p>
                </div>

                {/* Total Views */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6 md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-500/10 rounded-lg">
                            <Eye className="w-6 h-6 text-orange-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {formatNumber(stats?.totalWatchProgress || 0)}
                    </h3>
                    <p className="text-gray-400 text-sm">Total Watch Progress</p>
                </div>
            </div>

            {/* Host Revenue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-3 bg-indigo-500/10 rounded-lg">
                            <CreditCard className="w-6 h-6 text-indigo-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1 relative z-10">
                        {hostRevenue?.play4me?.balance ? `$${hostRevenue.play4me.balance}` : 'N/A'}
                    </h3>
                    <p className="text-indigo-400 text-sm relative z-10 font-medium">Doanh thu Play4Me VIP 2</p>
                    <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
                        <CreditCard className="w-24 h-24 text-indigo-500 translate-x-4 translate-y-4" />
                    </div>
                </div>
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-3 bg-cyan-500/10 rounded-lg">
                            <CreditCard className="w-6 h-6 text-cyan-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1 relative z-10">
                        {hostRevenue?.seekstreaming ? `N/A (Seekstreaming API chưa cấp SDK Doanh thu)` : 'N/A'}
                    </h3>
                    <p className="text-cyan-400 text-sm relative z-10 font-medium">Doanh thu Seekstreaming VIP 1</p>
                    <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
                        <CreditCard className="w-24 h-24 text-cyan-500 translate-x-4 translate-y-4" />
                    </div>
                </div>
            </div>

            {/* Tracking & System Status Section */}
            {stats?.tracking && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-6">Trạng thái hệ thống & Cần xử lý</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Pending Reports */}
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="p-3 bg-red-500/20 rounded-lg">
                                    <AlertTriangle className="w-6 h-6 text-red-500" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1 relative z-10">
                                {formatNumber(stats.tracking.pendingReports || 0)}
                            </h3>
                            <p className="text-red-400 text-sm relative z-10 font-medium">Báo lỗi chờ xử lý</p>
                            <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
                                <AlertTriangle className="w-24 h-24 text-red-500 translate-x-4 translate-y-4" />
                            </div>
                        </div>

                        {/* 4K Requests */}
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="p-3 bg-yellow-500/20 rounded-lg">
                                    <MonitorPlay className="w-6 h-6 text-yellow-500" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1 relative z-10">
                                {formatNumber(stats.tracking.pending4kRequests || 0)}
                            </h3>
                            <p className="text-yellow-400 text-sm relative z-10 font-medium">Yêu cầu 4K (VIP)</p>
                            <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
                                <MonitorPlay className="w-24 h-24 text-yellow-500 translate-x-4 translate-y-4" />
                            </div>
                        </div>

                        {/* System Uptime */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="p-3 bg-blue-500/20 rounded-lg">
                                    <Zap className="w-6 h-6 text-blue-500" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1 relative z-10">
                                {Math.floor(stats.tracking.systemTracking.uptime / 3600)}h {Math.floor((stats.tracking.systemTracking.uptime % 3600) / 60)}m
                            </h3>
                            <p className="text-blue-400 text-sm relative z-10 font-medium">Server Uptime</p>
                            <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
                                <Zap className="w-24 h-24 text-blue-500 translate-x-4 translate-y-4" />
                            </div>
                        </div>

                        {/* Memory Usage */}
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="p-3 bg-green-500/20 rounded-lg">
                                    <HardDrive className="w-6 h-6 text-green-500" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1 relative z-10">
                                {Math.round(stats.tracking.systemTracking.memory.heapUsed / 1024 / 1024)} MB
                            </h3>
                            <p className="text-green-400 text-sm relative z-10 font-medium">RAM Usage (Heap)</p>
                            <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
                                <HardDrive className="w-24 h-24 text-green-500 translate-x-4 translate-y-4" />
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* View Trends Chart */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Lượt xem (30 ngày qua)</h2>
                    <div className="h-[300px] w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={stats?.viewTrends.slice(-30)}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#E50914" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#E50914" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#6b7280"
                                    fontSize={12}
                                    tickFormatter={(str) => {
                                        const date = new Date(str);
                                        return `${date.getDate()}/${date.getMonth() + 1}`;
                                    }}
                                />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="views"
                                    name="Lượt xem"
                                    stroke="#E50914"
                                    fillOpacity={1}
                                    fill="url(#colorViews)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* User Registration Trends */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Người dùng mới (30 ngày qua)</h2>
                    <div className="h-[300px] w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={stats?.userTrends.slice(-30)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#6b7280"
                                    fontSize={12}
                                    tickFormatter={(str) => {
                                        const date = new Date(str);
                                        return `${date.getDate()}/${date.getMonth() + 1}`;
                                    }}
                                />
                                <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="users"
                                    name="Người dùng mới"
                                    fill="#3b82f6"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Movies List */}
            <div className="bg-surface-900 border border-white/10 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Xếp Hạng Nổi Bật (TMDB)</h2>
                    <button
                        onClick={clearTmdbCache}
                        className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs font-medium transition-colors"
                        title="Xóa cache TMDB trending để production cập nhật ngay"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Làm mới TMDB
                    </button>
                </div>
                <div className="space-y-4">
                    {stats?.topMovies.slice(0, 10).map((movie, index) => (
                        <div key={movie.slug}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className={`font-mono text-sm w-6 shrink-0 font-bold ${index < 3 ? 'text-primary' : 'text-gray-500'}`}>
                                        #{index + 1}
                                    </span>
                                    <span className="text-white text-sm truncate">{movie.name}</span>
                                </div>
                                <span className="text-gray-400 text-sm font-semibold ml-2 shrink-0">
                                    {formatNumber(movie.view)} lượt xem
                                </span>
                            </div>
                            <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${index < 3 ? 'bg-primary' : 'bg-gray-600'}`}
                                    style={{ width: `${(movie.view / maxViews) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
