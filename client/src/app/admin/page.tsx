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
                {/* Top Movies Chart */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6 overflow-hidden">
                    <h2 className="text-xl font-bold text-white mb-6">Top 10 Movies by Views</h2>
                    <div className="space-y-4">
                        {stats?.topMovies.slice(0, 10).map((movie, index) => (
                            <div key={movie.slug}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-gray-500 font-mono text-sm w-6 shrink-0">#{index + 1}</span>
                                        <span className="text-white text-sm truncate">{movie.name}</span>
                                    </div>
                                    <span className="text-primary text-sm font-semibold ml-2 shrink-0">
                                        {formatNumber(movie.view)}
                                    </span>
                                </div>
                                <div className="w-full bg-surface-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-linear-to-r from-primary to-yellow-500 h-full rounded-full transition-all"
                                        style={{ width: `${(movie.view / maxViews) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* View Trends Chart */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6 overflow-hidden">
                    <h2 className="text-xl font-bold text-white mb-6">View Trends (Last 30 Days)</h2>
                    <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
                        <div className="h-64 flex items-end gap-1 min-w-[500px]">
                            {stats?.viewTrends.slice(-30).map((trend, index) => {
                                const maxTrendViews = Math.max(...(stats?.viewTrends.map(t => t.views || 0) || [1]));
                                const height = ((trend.views || 0) / maxTrendViews) * 100;
                                return (
                                    <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                        <div
                                            className="w-full bg-linear-to-t from-blue-500 to-purple-500 rounded-t transition-all hover:opacity-80"
                                            style={{ height: `${height}%` }}
                                        />
                                        <div className="absolute -top-12 hidden group-hover:block bg-surface-800 p-2 rounded text-[10px] text-white whitespace-nowrap z-30 shadow-xl border border-white/10">
                                            {formatNumber(trend.views || 0)} views<br />
                                            {new Date(trend.date).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* User Registration Trends */}
            <div className="bg-surface-900 border border-white/10 rounded-xl p-6 mb-8 overflow-hidden">
                <h2 className="text-xl font-bold text-white mb-6">User Registration Trends (Last 30 Days)</h2>
                <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
                    <div className="h-48 flex items-end gap-1 min-w-[500px]">
                        {stats?.userTrends.slice(-30).map((trend, index) => {
                            const maxTrendUsers = Math.max(...(stats?.userTrends.map(t => t.users || 0) || [1]));
                            const height = ((trend.users || 0) / maxTrendUsers) * 100;
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                    <div
                                        className="w-full bg-linear-to-t from-blue-500 to-purple-500 rounded-t transition-all hover:opacity-80"
                                        style={{ height: `${height}%` }}
                                    />
                                    <div className="absolute -top-12 hidden group-hover:block bg-surface-800 p-2 rounded text-[10px] text-white whitespace-nowrap z-30 shadow-xl border border-white/10">
                                        {formatNumber(trend.users || 0)} users<br />
                                        {new Date(trend.date).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
