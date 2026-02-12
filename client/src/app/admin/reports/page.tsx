'use client';
import { useState, useEffect } from 'react';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Report {
    _id: string;
    movieSlug: string;
    movieName: string;
    episodeSlug: string;
    episodeName: string;
    content: string;
    status: 'pending' | 'fixed' | 'rejected';
    userId: {
        displayName: string;
        email: string;
    };
    createdAt: string;
}

export default function AdminReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await customFetch(`/api/admin/reports?status=${filter}&page=${page}&limit=20`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                setReports(data.data);
                setTotalPages(data.pagination.totalPages);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Fetch reports error:', error);
            toast.error('Lỗi khi tải báo cáo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [page, filter]);

    const handleResolve = async (reportId: string, status: 'fixed' | 'rejected') => {
        try {
            const res = await customFetch(`/api/admin/reports/${reportId}/resolve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status })
            });
            const data = await res.json();

            if (data.success) {
                toast.success(data.message);
                fetchReports();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Resolve report error:', error);
            toast.error('Lỗi khi xử lý báo cáo');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Quản lý Báo cáo lỗi</h1>

                <div className="flex gap-2">
                    {['pending', 'fixed', 'rejected'].map((s) => (
                        <Button
                            key={s}
                            variant={filter === s ? 'default' : 'outline'}
                            onClick={() => { setFilter(s); setPage(1); }}
                        >
                            {s === 'pending' && 'Chờ xử lý'}
                            {s === 'fixed' && 'Đã sửa'}
                            {s === 'rejected' && 'Từ chối'}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="bg-surface-900 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-surface-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Người báo</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Phim</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Tập phim</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Vấn đề</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Ngày báo</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {reports.map((report) => (
                            <tr key={report._id} className="hover:bg-surface-800/50">
                                <td className="px-4 py-3 text-sm text-white">
                                    <div className="font-medium">{report.userId.displayName}</div>
                                    <div className="text-xs text-gray-400">{report.userId.email}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-300">
                                    {report.movieName || report.movieSlug}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-400">
                                    {report.episodeName || report.episodeSlug}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-300 max-w-md">
                                    {report.content}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-400">
                                    {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {report.status === 'pending' && (
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleResolve(report._id, 'fixed')}
                                                className="text-green-500 hover:text-green-600"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleResolve(report._id, 'rejected')}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    Trước
                </Button>
                <span className="text-white">Trang {page} / {totalPages}</span>
                <Button
                    variant="outline"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                >
                    Sau
                </Button>
            </div>
        </div>
    );
}
