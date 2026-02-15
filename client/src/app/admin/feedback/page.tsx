'use client';
import { useEffect, useState } from 'react';
import {
    MessageSquare,
    Trash2,
    CheckCircle,
    Clock,
    User,
    Mail,
    Search,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { API_URL } from '@/lib/config';
import { getAuthToken } from '@/lib/api';

interface Feedback {
    _id: string;
    userId?: {
        displayName: string;
        email: string;
        avatar: string;
    };
    title: string;
    content: string;
    type: 'bug' | 'feature' | 'content' | 'other';
    email?: string;
    status: 'pending' | 'read' | 'replied';
    createdAt: string;
}

export default function AdminFeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const fetchFeedbacks = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/api/admin/feedback`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setFeedbacks(data.data);
            }
        } catch (error) {
            console.error('Fetch feedback error:', error);
            toast.error('Lỗi khi tải danh sách góp ý');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/api/admin/feedback/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Đã cập nhật trạng thái');
                setFeedbacks(prev => prev.map(f => f._id === id ? { ...f, status: status as Feedback['status'] } : f));
            }
        } catch (_error) {
            toast.error('Lỗi khi cập nhật trạng thái');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa góp ý này?')) return;
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/api/admin/feedback/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Đã xóa góp ý');
                setFeedbacks(prev => prev.filter(f => f._id !== id));
            }
        } catch (_error) {
            toast.error('Lỗi khi xóa góp ý');
        }
    };

    const filteredFeedbacks = feedbacks.filter(f => {
        const matchesSearch = f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.userId?.displayName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || f.type === filterType;
        const matchesStatus = filterStatus === 'all' || f.status === filterStatus;
        return matchesSearch && matchesType && matchesStatus;
    });

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'bug': return 'text-red-500 bg-red-500/10';
            case 'feature': return 'text-blue-500 bg-blue-500/10';
            case 'content': return 'text-green-500 bg-green-500/10';
            default: return 'text-gray-400 bg-gray-400/10';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'read': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'replied': return <ArrowRight className="w-4 h-4 text-blue-500" />;
            default: return <Clock className="w-4 h-4 text-yellow-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <MessageSquare className="text-primary" />
                        Quản lý Góp ý & Báo lỗi
                    </h1>
                    <p className="text-gray-400 text-sm">Xem và quản lý phản hồi từ người dùng</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{filteredFeedbacks.length} ý kiến</span>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-surface-900 border border-white/10 rounded-xl">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                        placeholder="Tìm kiếm nội dung, tiêu đề, người dùng..."
                        className="pl-10 bg-black/50 border-white/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div>
                    <select
                        className="w-full h-10 px-3 bg-black/50 border border-white/10 rounded-lg text-sm text-white focus:border-primary outline-none"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">Tất cả loại</option>
                        <option value="bug">Lỗi (Bug)</option>
                        <option value="feature">Tính năng</option>
                        <option value="content">Nội dung</option>
                        <option value="other">Khác</option>
                    </select>
                </div>
                <div>
                    <select
                        className="w-full h-10 px-3 bg-black/50 border border-white/10 rounded-lg text-sm text-white focus:border-primary outline-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="pending">Chờ xử lý</option>
                        <option value="read">Đã đọc</option>
                        <option value="replied">Đã phản hồi</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filteredFeedbacks.length === 0 ? (
                <div className="p-12 text-center bg-surface-900 border border-white/10 rounded-xl">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Không tìm thấy góp ý nào</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredFeedbacks.map((feedback) => (
                        <div key={feedback._id} className="bg-surface-900 border border-white/10 rounded-xl overflow-hidden hover:border-primary/30 transition-all group">
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getTypeColor(feedback.type)}`}>
                                            {feedback.type}
                                        </div>
                                        <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                                            {feedback.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-xs">
                                            {getStatusIcon(feedback.status)}
                                            <span className="capitalize text-gray-300">{feedback.status}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-500/10"
                                            onClick={() => handleDelete(feedback._id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <p className="text-gray-400 text-sm mb-4 line-clamp-2 md:line-clamp-none whitespace-pre-wrap">
                                    {feedback.content}
                                </p>

                                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5 mt-auto">
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            {feedback.userId ? (
                                                <span className="text-gray-300 font-medium">{feedback.userId.displayName}</span>
                                            ) : (
                                                <span>Ẩn danh</span>
                                            )}
                                        </div>
                                        {feedback.email && (
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5" />
                                                <span className="text-gray-400">{feedback.email}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{new Date(feedback.createdAt).toLocaleString('vi-VN')}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {feedback.status !== 'read' && feedback.status !== 'replied' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs border-white/10"
                                                onClick={() => handleUpdateStatus(feedback._id, 'read')}
                                            >
                                                Đánh dấu đã đọc
                                            </Button>
                                        )}
                                        {feedback.status !== 'replied' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs border-white/10 text-primary hover:border-primary/50"
                                                onClick={() => handleUpdateStatus(feedback._id, 'replied')}
                                            >
                                                Đã phản hồi
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
