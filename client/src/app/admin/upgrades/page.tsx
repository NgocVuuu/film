'use client';
import { useState, useEffect } from 'react';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Clock, User, CreditCard, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

interface UpgradeRequest {
    _id: string;
    userId: {
        _id: string;
        displayName: string;
        email: string;
    };
    planId: string;
    planName: string;
    tier: 'premium' | 'vip';
    durationMonths: number;
    amount: number;
    paymentCode: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    createdAt: string;
    resolvedAt?: string;
}

export default function AdminUpgradesPage() {
    const [upgrades, setUpgrades] = useState<UpgradeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('pending');

    const fetchUpgrades = async () => {
        try {
            setLoading(true);
            const url = filterStatus ? `/api/admin/upgrades?status=${filterStatus}` : '/api/admin/upgrades';
            const res = await customFetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setUpgrades(data.data);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Lỗi khi tải danh sách phiếu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUpgrades();
    }, [filterStatus]);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            setActionLoading(id);
            const res = await customFetch(`/api/admin/upgrades/${id}/${action}`, {
                method: 'PUT',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                fetchUpgrades();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Lỗi khi xử lý thao tác');
        } finally {
            setActionLoading(null);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold"><Clock className="w-3 h-3" />Đang chờ</span>;
            case 'approved':
                return <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold"><Check className="w-3 h-3" />Đã duyệt</span>;
            case 'rejected':
                return <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-bold"><X className="w-3 h-3" />Từ chối</span>;
            default:
                return <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-full text-xs">{status}</span>;
        }
    };

    const getTierBadge = (tier: string) => {
        if (tier === 'vip') {
            return <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-[10px] font-bold"><Crown className="w-2.5 h-2.5" />VIP</span>;
        }
        return <span className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold">PRE</span>;
    };

    const pendingCount = upgrades.filter(u => u.status === 'pending').length;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        Upgrade Requests
                        {filterStatus === 'pending' && pendingCount > 0 && (
                            <span className="px-2 py-0.5 bg-amber-500 text-black text-sm font-bold rounded-full">{pendingCount}</span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Duyệt thủ công các giao dịch WeScan & BuyMeACoffee</p>
                </div>

                <div className="flex bg-surface-800 p-1 rounded-lg border border-white/5">
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'pending' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        Đang chờ
                    </button>
                    <button
                        onClick={() => setFilterStatus('approved')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'approved' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        Đã duyệt
                    </button>
                    <button
                        onClick={() => setFilterStatus('')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === '' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        Tất cả
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="bg-surface-800 rounded-xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Khách hàng</th>
                                    <th className="px-6 py-4 font-semibold">Gói cước</th>
                                    <th className="px-6 py-4 font-semibold">Số tiền</th>
                                    <th className="px-6 py-4 font-semibold">Mã thanh toán</th>
                                    <th className="px-6 py-4 font-semibold">Trạng thái</th>
                                    <th className="px-6 py-4 font-semibold">Ngày tạo</th>
                                    <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {upgrades.map((item) => (
                                    <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white tracking-tight">{item.userId?.displayName || 'N/A'}</p>
                                                    <p className="text-[10px] text-gray-500">{item.userId?.email || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getTierBadge(item.tier)}
                                                <span className="text-sm text-gray-300 font-medium">{item.planName}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-600 mt-0.5">{item.durationMonths} tháng</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono font-bold text-primary">
                                            {formatPrice(item.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-black/40 border border-white/10 rounded font-mono text-sm text-yellow-400 font-bold">
                                                {item.paymentCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {new Date(item.createdAt).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.status === 'pending' ? (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleAction(item._id, 'reject')}
                                                        disabled={actionLoading === item._id}
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAction(item._id, 'approve')}
                                                        disabled={actionLoading === item._id}
                                                        className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                                                    >
                                                        {actionLoading === item._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        <span className="ml-1">Duyệt</span>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-600 italic">
                                                    {item.resolvedAt ? `Xử lý lúc ${new Date(item.resolvedAt).toLocaleTimeString('vi-VN')}` : 'Đã xử lý'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {upgrades.length === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            Không có phiếu yêu cầu nào.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
