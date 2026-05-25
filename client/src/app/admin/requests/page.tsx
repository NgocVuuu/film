'use client';
import { useEffect, useState, useCallback } from 'react';
import { X, Loader2, Film, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';

interface MovieRequest {
    _id: string;
    userId: {
        displayName: string;
        email?: string;
    };
    movieName: string;
    movieSlug?: string;
    status: string;
    type?: string;
    priority: number;
    requestCount: number;
    vipCount?: number;
    premiumCount?: number;
    createdAt: string;
    errorMessage?: string;
}

export default function AdminRequestsPage() {
    const [requests, setRequests] = useState<MovieRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const response = await customFetch(
                `/api/admin/movie-requests?page=${page}&limit=20&status=${filter}`,
                {
                    credentials: 'include'
                }
            );

            const data = await response.json();
            if (data.success) {
                setRequests(data.data);
                setTotalPages(data.pagination.totalPages);
            }
        } catch (error) {
            console.error('Fetch requests error:', error);
            toast.error('Lỗi khi tải danh sách');
        } finally {
            setLoading(false);
        }
    }, [page, filter]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleApprove = async (requestId: string) => {
        try {
            toast.loading('Đang tự động tải phim...', { id: 'fetch-request' });
            const response = await customFetch(
                `/api/admin/movie-requests/${requestId}/approve`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );

            const data = await response.json();
            if (data.success) {
                toast.success(data.message, { id: 'fetch-request' });
                fetchRequests();
            } else {
                toast.error(data.message, { id: 'fetch-request' });
            }
        } catch (error) {
            console.error('Approve request error:', error);
            toast.error('Lỗi khi xử lý yêu cầu', { id: 'fetch-request' });
        }
    };

    const handleReject = async (requestId: string) => {
        const reason = prompt('Lý do từ chối (tùy chọn):');
        if (reason === null) return;

        try {
            const response = await customFetch(
                `/api/admin/movie-requests/${requestId}/reject`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ reason })
                }
            );

            const data = await response.json();
            if (data.success) {
                toast.success('Đã từ chối yêu cầu');
                fetchRequests();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Reject request error:', error);
            toast.error('Lỗi khi từ chối');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-500/20 text-yellow-400',
            processing: 'bg-blue-500/20 text-blue-400',
            completed: 'bg-green-500/20 text-green-400',
            failed: 'bg-red-500/20 text-red-400'
        };
        return styles[status as keyof typeof styles] || 'bg-gray-500/20 text-gray-400';
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">Movie Requests</h1>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-3">
                <Button
                    onClick={() => { setFilter('pending'); setPage(1); }}
                    variant={filter === 'pending' ? 'default' : 'outline'}
                    className={filter === 'pending' ? 'bg-primary text-black' : 'border-white/10'}
                >
                    Pending
                </Button>
                <Button
                    onClick={() => { setFilter('processing'); setPage(1); }}
                    variant={filter === 'processing' ? 'default' : 'outline'}
                    className={filter === 'processing' ? 'bg-primary text-black' : 'border-white/10'}
                >
                    Processing
                </Button>
                <Button
                    onClick={() => { setFilter('completed'); setPage(1); }}
                    variant={filter === 'completed' ? 'default' : 'outline'}
                    className={filter === 'completed' ? 'bg-primary text-black' : 'border-white/10'}
                >
                    Completed
                </Button>
                <Button
                    onClick={() => { setFilter('failed'); setPage(1); }}
                    variant={filter === 'failed' ? 'default' : 'outline'}
                    className={filter === 'failed' ? 'bg-primary text-black' : 'border-white/10'}
                >
                    Failed
                </Button>
            </div>

            {/* Requests Table */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            ) : (
                <div className="bg-surface-900 border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px]">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 whitespace-nowrap w-1/4">Movie</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 whitespace-nowrap">Requested By</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 whitespace-nowrap text-center">Type</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 whitespace-nowrap w-48">Priority</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300 whitespace-nowrap">Status</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300 whitespace-nowrap">Date</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300 whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {requests.map((request) => (
                                    <tr key={request._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 min-w-[250px]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Film className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-white text-sm line-clamp-2 leading-snug">{request.movieName}</div>
                                                    {request.movieSlug && (
                                                        <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">{request.movieSlug}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-300">
                                                {request.userId?.displayName || 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            {request.type === '4k_upgrade' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-black rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 uppercase tracking-wider">
                                                    4K Upgrade
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-black rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                                                    New Movie
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 shrink-0">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm font-black text-white">{request.priority}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs text-yellow-500 font-black tracking-tight">
                                                        VIP: {request.vipCount || 0}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-bold">
                                                        Premium: {request.premiumCount || 0}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-medium">
                                                        Tổng: {request.requestCount}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider ${getStatusBadge(request.status)}`}>
                                                {request.status}
                                            </span>
                                            {request.errorMessage && (
                                                <div className="text-[10px] text-red-400 mt-1.5 max-w-[150px] truncate mx-auto" title={request.errorMessage}>
                                                    {request.errorMessage}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <div className="text-[13px] text-gray-400 font-medium">
                                                {new Date(request.createdAt).toLocaleDateString('vi-VN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {(request.status === 'pending' || request.status === 'failed') && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleApprove(request._id)}
                                                            className="bg-primary/20 text-primary hover:bg-primary/30"
                                                        >
                                                            <Download className="w-4 h-4 mr-1" />
                                                            {request.status === 'failed' ? 'Retry' : 'Fetch Now'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleReject(request._id)}
                                                            className="border-white/10 hover:bg-red-500/10 hover:text-red-400"
                                                        >
                                                            <X className="w-4 h-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                {request.status === 'processing' && (
                                                    <div className="flex items-center gap-2 text-sm text-blue-400">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Đang xử lý...</span>
                                                    </div>
                                                )}
                                                {request.status === 'completed' && request.movieSlug && (
                                                    <a
                                                        href={`/movie/${request.movieSlug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-green-400 hover:underline"
                                                    >
                                                        Xem phim →
                                                    </a>
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
