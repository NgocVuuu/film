'use client';
import { useEffect, useState } from 'react';
import { XCircle, Loader2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';

interface Subscription {
    _id: string;
    displayName: string;
    email?: string;
    phoneNumber?: string;
    subscription: {
        tier: string;
        status: string;
        startDate: string;
        endDate: string;
        autoRenew: boolean;
    };
}

export default function AdminSubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchSubscriptions();
    }, [page, filter]);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            const response = await customFetch(
                `/api/admin/subscriptions?page=${page}&limit=20&status=${filter}`,
                {
                    credentials: 'include'
                }
            );

            const data = await response.json();
            if (data.success) {
                setSubscriptions(data.data);
                setTotalPages(data.pagination.totalPages);
            }
        } catch (error) {
            console.error('Fetch subscriptions error:', error);
            toast.error('Lỗi khi tải danh sách');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async (userId: string) => {
        if (!confirm('Hủy đăng ký này? User sẽ mất quyền Premium ngay lập tức.')) return;

        try {
            const response = await customFetch(
                `/api/admin/subscriptions/${userId}/cancel`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );

            const data = await response.json();
            if (data.success) {
                toast.success('Đã hủy đăng ký');
                fetchSubscriptions();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Cancel subscription error:', error);
            toast.error('Lỗi khi hủy');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const getDaysRemaining = (endDate: string) => {
        const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">Subscription Management</h1>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-3">
                <Button
                    onClick={() => { setFilter('active'); setPage(1); }}
                    variant={filter === 'active' ? 'default' : 'outline'}
                    className={filter === 'active' ? 'bg-primary text-black' : 'border-white/10'}
                >
                    Active
                </Button>
                <Button
                    onClick={() => { setFilter('expired'); setPage(1); }}
                    variant={filter === 'expired' ? 'default' : 'outline'}
                    className={filter === 'expired' ? 'bg-primary text-black' : 'border-white/10'}
                >
                    Expired
                </Button>
                <Button
                    onClick={() => { setFilter(''); setPage(1); }}
                    variant={filter === '' ? 'default' : 'outline'}
                    className={filter === '' ? 'bg-primary text-black' : 'border-white/10'}
                >
                    All
                </Button>
            </div>

            {/* Subscriptions Table */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            ) : (
                <div className="bg-surface-900 border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Tier</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Start Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">End Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Days Left</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {subscriptions.map((sub) => (
                                    <tr key={sub._id} className="hover:bg-white/5">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{sub.displayName}</div>
                                            <div className="text-sm text-gray-400">
                                                {sub.email || sub.phoneNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Crown className="w-4 h-4 text-primary" />
                                                <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary">
                                                    {sub.subscription?.tier || 'free'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {sub.subscription?.startDate
                                                ? formatDate(sub.subscription.startDate)
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {sub.subscription?.endDate
                                                ? formatDate(sub.subscription.endDate)
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {sub.subscription?.endDate && (
                                                <span className={`text-sm font-medium ${getDaysRemaining(sub.subscription.endDate) > 7
                                                    ? 'text-green-400'
                                                    : getDaysRemaining(sub.subscription.endDate) > 0
                                                        ? 'text-yellow-400'
                                                        : 'text-red-400'
                                                    }`}>
                                                    {getDaysRemaining(sub.subscription.endDate)} days
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end">
                                                {sub.subscription?.status === 'active' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleCancelSubscription(sub._id)}
                                                        className="border-white/10 hover:bg-red-500/10 hover:text-red-400"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-2" />
                                                        Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                        <p className="text-sm text-gray-400">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="border-white/10"
                            >
                                Previous
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page === totalPages}
                                className="border-white/10"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
