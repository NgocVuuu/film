'use client';
import { useEffect, useState } from 'react';
import { Users, CreditCard, Film, TrendingUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/config';

interface DashboardStats {
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    newUsers: number;
    totalMovies: number;
    totalWatchProgress: number;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/stats`, {
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Total Users */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Users className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-sm text-green-400">
                            +{stats?.newUsers || 0} (7d)
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {stats?.totalUsers || 0}
                    </h3>
                    <p className="text-gray-400 text-sm">Total Users</p>
                </div>

                {/* Active Subscriptions */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <CreditCard className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {stats?.activeSubscriptions || 0}
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
                        {stats?.totalMovies || 0}
                    </h3>
                    <p className="text-gray-400 text-sm">Total Movies</p>
                </div>

                {/* Watch Progress */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6 md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-500/10 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-orange-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {stats?.totalWatchProgress || 0}
                    </h3>
                    <p className="text-gray-400 text-sm">Total Watch Progress Records</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <a
                        href="/admin/users"
                        className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-center"
                    >
                        <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-sm text-gray-300">Manage Users</p>
                    </a>
                    <a
                        href="/admin/subscriptions"
                        className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-center"
                    >
                        <CreditCard className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-sm text-gray-300">Subscriptions</p>
                    </a>
                    <a
                        href="/admin/requests"
                        className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-center"
                    >
                        <Film className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-sm text-gray-300">Movie Requests</p>
                    </a>
                    <a
                        href="/"
                        className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-center"
                    >
                        <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-sm text-gray-300">View Site</p>
                    </a>
                </div>
            </div>
        </div>
    );
}
