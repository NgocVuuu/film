'use client';
import { useEffect, useState } from 'react';
import { Play, Loader2, RefreshCw, Trash2, ShieldAlert, Download } from 'lucide-react';
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

    // Fetch specific movie states
    const [movieSlug, setMovieSlug] = useState('');
    const [movieSource, setMovieSource] = useState('');
    const [fetching, setFetching] = useState(false);

    const [logs, setLogs] = useState<{ time: string, message: string, type: string }[]>([]);

    useEffect(() => {
        fetchStatus();
        fetchBlacklist();
        const interval = setInterval(() => {
            fetchStatus();
            fetchLogs();
        }, 3000); // Poll every 3s
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

    const fetchLogs = async () => {
        try {
            const response = await customFetch(`/api/admin/crawler/logs`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setLogs(data.data);
            }
        } catch (error) {
            console.error('Fetch logs error:', error);
        }
    };

    const handleStartCrawl = async (full: boolean = false) => {
        if (status?.isRunning) return;

        const confirmMsg = full
            ? `Cảnh báo: Full Crawl sẽ quét TOÀN BỘ ${totalPages} trang. Tiếp tục?`
            : `Bắt đầu Quick Update (Trang 1-${totalPages})?`;

        if (!confirm(confirmMsg)) return;

        try {
            const response = await customFetch(`/api/admin/crawler/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full,
                    fromPage: 1,
                    toPage: parseInt(totalPages) || 1
                })
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                fetchStatus();
                fetchLogs();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Lỗi khởi động crawler');
        }
    };

    const handleStopCrawl = async () => {
        try {
            const response = await customFetch(`/api/admin/crawler/stop`, {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                fetchStatus();
            }
        } catch (error) {
            toast.error('Lỗi dừng crawler');
        }
    };

    const handleAddToBlacklist = async () => {
        if (!newItem.trim()) return;
        try {
            const response = await customFetch(`/api/admin/crawler/blacklist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            toast.error('Lỗi thêm blacklist');
        }
    };

    const handleRemoveFromBlacklist = async (slug: string) => {
        try {
            const response = await customFetch(`/api/admin/crawler/blacklist`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
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
            toast.error('Lỗi xóa blacklist');
        }
    };

    const handleFetchMovie = async () => {
        if (!movieSlug.trim()) {
            toast.error('Vui lòng nhập slug của phim');
            return;
        }

        try {
            setFetching(true);
            toast.loading('Đang tải phim từ nguồn...', { id: 'fetch-movie' });

            const response = await customFetch(`/api/admin/crawler/fetch-movie`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    slug: movieSlug.trim(),
                    source: movieSource || null
                })
            });
            const data = await response.json();

            if (data.success) {
                toast.success(data.message, { id: 'fetch-movie' });
                setMovieSlug('');
                setMovieSource('');
            } else {
                toast.error(data.message, { id: 'fetch-movie' });
            }
        } catch (error) {
            toast.error('Lỗi khi tải phim', { id: 'fetch-movie' });
        } finally {
            setFetching(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin" /></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Crawler Manager</h1>

            {/* Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Status & Controls */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Trạng thái</h2>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${status?.isRunning ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {status?.isRunning ? 'Đang chạy' : 'Đang nghỉ'}
                        </div>
                    </div>

                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-xs text-gray-400 mb-1 block">Số trang quét</label>
                            <input
                                type="number"
                                value={totalPages}
                                onChange={(e) => setTotalPages(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <Button
                            onClick={() => handleStartCrawl(false)}
                            disabled={status?.isRunning}
                            className="bg-primary text-black hover:bg-primary/90"
                        >
                            <Play className="w-4 h-4 mr-2" /> Start Update
                        </Button>
                        <Button
                            onClick={() => handleStartCrawl(true)}
                            disabled={status?.isRunning}
                            variant="destructive"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Full Crawl
                        </Button>
                        {status?.isRunning && (
                            <Button onClick={handleStopCrawl} variant="secondary">Stop</Button>
                        )}
                    </div>
                </div>

                {/* Fetch Specific Movie */}
                <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Tải phim lẻ</h2>
                    <div className="flex gap-2">
                        <input
                            value={movieSlug}
                            onChange={(e) => setMovieSlug(e.target.value)}
                            placeholder="Slug phim (vd: mai-2024)"
                            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                        />
                        <Button onClick={handleFetchMovie} disabled={fetching}>
                            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Logs Terminal */}
            <div className="bg-black/80 border border-white/10 rounded-xl p-4 font-mono text-sm h-[400px] overflow-y-auto mb-8 shadow-inner">
                <div className="text-gray-500 mb-2 border-b border-white/10 pb-2">System Logs...</div>
                {logs.map((log, i) => (
                    <div key={i} className={`mb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'warning' ? 'text-yellow-400' : 'text-gray-300'}`}>
                        <span className="text-gray-600 mr-2">[{new Date(log.time).toLocaleTimeString()}]</span>
                        {log.message}
                    </div>
                ))}
                {logs.length === 0 && <div className="text-gray-600 italic">Chưa có log nào...</div>}
            </div>

            {/* Blacklist Section */}
            <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Blacklist ({blacklist.length})</h2>
                <div className="flex gap-2 mb-4">
                    <input
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder="Slug to block..."
                        className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                    />
                    <Button onClick={handleAddToBlacklist} variant="destructive">Block</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {blacklist.map(slug => (
                        <div key={slug} className="bg-white/5 px-3 py-1 rounded-full flex items-center gap-2 text-sm text-gray-300">
                            {slug}
                            <button onClick={() => handleRemoveFromBlacklist(slug)} className="hover:text-red-400">×</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
