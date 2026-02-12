'use client';
import { useEffect, useState } from 'react';
import { Play, Loader2, StopCircle, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';

interface CrawlerStatus {
    isRunning: boolean;
    blacklistSize: number;
    currentPage?: number;
}

export default function AdminCrawlerPage() {
    const [status, setStatus] = useState<CrawlerStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [blacklist, setBlacklist] = useState<string[]>([]);
    const [newItem, setNewItem] = useState('');
    const [totalPages, setTotalPages] = useState('50');

    useEffect(() => {
        fetchStatus();
        fetchBlacklist();
        const interval = setInterval(fetchStatus, 3000); // Poll status every 3s
        return () => clearInterval(interval);
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await customFetch(`/api/admin/crawler/status`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setStatus(data.data);
            }
        } catch (error) {
            console.error('Fetch status error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBlacklist = async () => {
        try {
            const response = await customFetch(`/api/admin/crawler/blacklist`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setBlacklist(data.data);
            }
        } catch (error) {
            console.error('Fetch blacklist error:', error);
        }
    };

    const handleSync = async (full: boolean = false) => {
        if (status?.isRunning) return;

        if (full && !confirm(`Cảnh báo: Crawl tất cả sẽ mất RẤT NHIỀU THỜI GIAN.\nBạn có chắc muốn crawl ${totalPages} trang không?`)) {
            return;
        }

        try {
            const response = await customFetch(`/api/admin/crawler/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    full,
                    pages: full ? parseInt(totalPages) : 1
                })
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                fetchStatus();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Lỗi khi kích hoạt sync');
        }
    };

    const handleAddToBlacklist = async () => {
        if (!newItem.trim()) return;
        try {
            const response = await customFetch(`/api/admin/crawler/blacklist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ slug: newItem.trim() })
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                setNewItem('');
                fetchBlacklist();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Add blacklist error:', error);
            toast.error('Lỗi thêm blacklist');
        }
    };

    const handleRemoveFromBlacklist = async (slug: string) => {
        try {
            const response = await customFetch(`/api/admin/crawler/blacklist`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ slug })
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                fetchBlacklist();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Remove blacklist error:', error);
            toast.error('Lỗi xóa blacklist');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Crawler Management</h1>

            {/* Status Card */}
            <div className="bg-surface-900 border border-white/10 rounded-xl p-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Sync Status</h2>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${status?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                            <span className="text-gray-400">
                                {status?.isRunning
                                    ? `Running (Page ${status.currentPage})...`
                                    : 'Idle'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <Button
                            onClick={() => handleSync(false)}
                            disabled={status?.isRunning}
                            className={`${status?.isRunning
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-primary text-black hover:bg-primary/90'
                                }`}
                        >
                            {status?.isRunning ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Quick Update (Page 1)
                                </>
                            )}
                        </Button>

                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
                            <input
                                type="number"
                                value={totalPages}
                                onChange={(e) => setTotalPages(e.target.value)}
                                className="w-16 bg-transparent text-white text-center text-sm focus:outline-none"
                                placeholder="Pages"
                                min="1"
                                max="1000"
                                disabled={status?.isRunning}
                            />
                            <Button
                                onClick={() => handleSync(true)}
                                disabled={status?.isRunning}
                                variant="destructive"
                                size="sm"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${status?.isRunning ? 'animate-spin' : ''}`} />
                                Full Crawl
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-sm text-gray-400">
                        <span className="text-white font-bold">Lưu ý:</span>
                        <br />- <b>Quick Update:</b> Chỉ quét trang 1 để lấy phim mới nhất (Nhanh).
                        <br />- <b>Full Crawl:</b> Quét sâu nhiều trang để lấy lại phim cũ (Rất lâu).
                    </p>
                </div>
            </div>

            {/* Blacklist Section */}
            <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    Blacklist Management
                </h2>

                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Enter movie slug to block..."
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                    />
                    <Button
                        onClick={handleAddToBlacklist}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50"
                    >
                        Block Slug
                    </Button>
                </div>

                {blacklist.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Blacklist is empty</p>
                ) : (
                    <div className="space-y-2">
                        {blacklist.map((slug) => (
                            <div key={slug} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                <span className="text-gray-300 font-mono">{slug}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveFromBlacklist(slug)}
                                    className="text-gray-400 hover:text-white hover:bg-white/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
