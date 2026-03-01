'use client';
import { useEffect, useState } from 'react';
import { Users, CreditCard, Film, TrendingUp, Loader2, Eye, UserPlus, Activity } from 'lucide-react';
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

    useEffect(() => {
        fetchStats();
    }, []);

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

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* View Trends Chart */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Lượt xem (30 ngày qua)</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
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
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
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
                <h2 className="text-xl font-bold text-white mb-6">Top 10 Phim Xem Nhiều Nhất</h2>
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
