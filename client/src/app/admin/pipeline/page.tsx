'use client';
import { useEffect, useState } from 'react';
import { Play, Loader2, RefreshCw, AlertTriangle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';

export default function AdminPipelinePage() {
    const [uploads, setUploads] = useState<any[]>([]);
    const [captchas, setCaptchas] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'uploads' | 'captchas'>('uploads');
    const [loading, setLoading] = useState(true);

    // Active ingestion states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
    const [searchingMovies, setSearchingMovies] = useState(false);
    const [mkvUrlInput, setMkvUrlInput] = useState('');
    const [crawlingUrl, setCrawlingUrl] = useState(false);

    const API_BASE = 'http://localhost:9888';

    // Movie search debounce hook
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const delayDebounce = setTimeout(async () => {
            setSearchingMovies(true);
            try {
                const res = await customFetch(`/api/admin/movies?search=${encodeURIComponent(searchQuery)}`, {
                    credentials: 'include'
                });
                const data = await res.json();
                if (data.success && data.data) {
                    setSearchResults(data.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setSearchingMovies(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    const handleStartActiveCrawl = async () => {
        if (!selectedMovie || !mkvUrlInput.trim()) return;

        setCrawlingUrl(true);
        try {
            const res = await fetch(`${API_BASE}/admin/crawl-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    movieId: selectedMovie._id,
                    url: mkvUrlInput.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                toast.success(data.message || 'Bắt đầu cào thành công!');
                setMkvUrlInput('');
                setSelectedMovie(null);
                setSearchQuery('');
                fetchData();
            } else {
                toast.error(data.error || 'Lỗi khi gửi yêu cầu cào');
            }
        } catch (e) {
            toast.error('Lỗi kết nối tới Server Crawler');
        } finally {
            setCrawlingUrl(false);
        }
    };

    const fetchData = async () => {
        try {
            const resUp = await fetch(`${API_BASE}/admin/uploads`);
            if (resUp.ok) setUploads(await resUp.json());

            const resCap = await fetch(`${API_BASE}/admin/captcha`);
            if (resCap.ok) setCaptchas(await resCap.json());
        } catch (e) {
            console.error('Fetch error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRetry = async (id: string) => {
        try {
            await fetch(`${API_BASE}/admin/uploads/${id}/retry`, { method: 'POST' });
            toast.success('Retry sent');
            fetchData();
        } catch (e) {
            toast.error('Failed to retry');
        }
    };

    const handleResolveCaptcha = async (id: string) => {
        try {
            await fetch(`${API_BASE}/admin/captcha/${id}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resolved: true })
            });
            toast.success('Captcha marked as resolved');
            fetchData();
        } catch (e) {
            toast.error('Failed to resolve');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Play className="w-6 h-6 text-primary" />
                    Auto Pipeline
                </h1>
                <Button 
                    variant="outline" 
                    className="border-white/10"
                    onClick={fetchData}
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Active Ingestion Form */}
            <div className="bg-[#111115] border border-white/10 rounded-xl p-6 mb-6 shadow-lg">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Chủ Động Cào 4K (Active Ingestion)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search Movie in DB */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-400 mb-2">1. Chọn Phim Trong Database</label>
                        {selectedMovie ? (
                            <div className="flex items-center justify-between bg-white/5 border border-primary/40 rounded px-3 py-2 text-white">
                                <div className="truncate pr-2">
                                    <span className="font-semibold text-primary">{selectedMovie.name}</span>
                                    <span className="text-xs text-gray-400 ml-2">({selectedMovie.year || 'N/A'})</span>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                        setSelectedMovie(null);
                                        setSearchQuery('');
                                    }}
                                    className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
                                >
                                    Thay đổi
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Nhập tên phim để tìm..."
                                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                    />
                                    {searchingMovies && (
                                        <div className="absolute right-3 top-2.5">
                                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1.5 bg-[#18181c] border border-white/10 rounded-lg shadow-2xl max-h-[220px] overflow-y-auto divide-y divide-white/5">
                                        {searchResults.map((m) => (
                                            <div
                                                key={m._id}
                                                onClick={() => {
                                                    setSelectedMovie(m);
                                                    setSearchResults([]);
                                                }}
                                                className="p-3 hover:bg-primary/20 hover:text-white cursor-pointer text-sm text-gray-200 transition-colors"
                                            >
                                                <div className="font-semibold text-white">{m.name}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">{m.origin_name} {m.year ? `(${m.year})` : ''}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* MKVDrama URL Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">2. Nhập Link mkvdrama (Season hoặc Tập phim)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={mkvUrlInput}
                                onChange={(e) => setMkvUrlInput(e.target.value)}
                                placeholder="https://mkvdrama.net/..."
                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                            />
                            <Button 
                                onClick={handleStartActiveCrawl}
                                disabled={crawlingUrl || !selectedMovie || !mkvUrlInput.trim()}
                                className="bg-primary hover:bg-primary-hover text-white text-sm"
                            >
                                {crawlingUrl ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Đang cào...
                                    </>
                                ) : (
                                    'Bắt đầu cào'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    * Hệ thống hỗ trợ cào cả liên kết mùa phim (Season) để cào hàng loạt, hoặc liên kết tập phim lẻ. Robot sẽ tự động phân tích và xếp hàng vào pipeline.
                </p>
            </div>

            <div className="flex space-x-1 border-b border-white/10 mb-6">
                <button
                    onClick={() => setActiveTab('uploads')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'uploads'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    Uploads ({uploads.length})
                </button>
                <button
                    onClick={() => setActiveTab('captchas')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                        activeTab === 'captchas'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    Pending Captchas 
                    {captchas.filter(c => c.status === 'pending').length > 0 && (
                        <span className="bg-red-500/20 text-red-500 text-xs px-2 py-0.5 rounded-full">
                            {captchas.filter(c => c.status === 'pending').length}
                        </span>
                    )}
                </button>
            </div>

            {loading && uploads.length === 0 && captchas.length === 0 ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {activeTab === 'uploads' && (
                        <div className="bg-surface-900 border border-white/10 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 border-b border-white/10">
                                        <tr>
                                            <th className="px-6 py-4 font-medium text-gray-400">File / Episode</th>
                                            <th className="px-6 py-4 font-medium text-gray-400">Series</th>
                                            <th className="px-6 py-4 font-medium text-gray-400">Host</th>
                                            <th className="px-6 py-4 font-medium text-gray-400">Status</th>
                                            <th className="px-6 py-4 font-medium text-gray-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {uploads.map((u) => (
                                            <tr key={u._id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white truncate max-w-xs" title={u.filename || 'N/A'}>
                                                        {u.filename || 'N/A'}
                                                    </div>
                                                    <div className="text-gray-400 text-xs mt-1">
                                                        SS{u.season} - EP{u.episode}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400">{u.series}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white/10 text-gray-300">
                                                        {u.host}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                        u.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                                        u.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                                                        'bg-yellow-500/20 text-yellow-500'
                                                    }`}>
                                                        {u.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button 
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleRetry(u._id)}
                                                        className="border-white/10 hover:bg-primary/20 hover:text-primary"
                                                    >
                                                        <RefreshCw className="w-4 h-4 mr-2" />
                                                        Retry
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {uploads.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                    No uploads found in the pipeline.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'captchas' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {captchas.map(c => (
                                <div key={c.id} className="bg-surface-900 border border-red-500/30 rounded-xl p-4 flex flex-col relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                    <h3 className="font-bold text-lg text-white mb-1 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                        Captcha Required
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-4 truncate" title={c.pageUrl}>
                                        Target: {c.pageUrl}
                                    </p>
                                    
                                    <div className="mb-4 bg-black/40 rounded-lg p-2 flex-grow border border-white/5 flex items-center justify-center min-h-[200px]">
                                        {c.status === 'pending' ? (
                                            <img 
                                                src={`${API_BASE}/admin/captcha/${c.id}/screenshot`} 
                                                alt="Captcha" 
                                                className="max-h-64 object-contain rounded"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="text-gray-500 flex flex-col items-center">
                                                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                                Already Resolved
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2 mt-auto">
                                        <Button 
                                            variant="secondary"
                                            className="flex-1 bg-green-500/20 text-green-500 hover:bg-green-500/30 border-0"
                                            onClick={() => handleResolveCaptcha(c.id)}
                                            disabled={c.status !== 'pending'}
                                        >
                                            {c.status === 'pending' ? 'Mark Resolved' : 'Resolved'}
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            className="flex-1 border-white/10"
                                            asChild
                                        >
                                            <a href={c.pageUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                                                <span>Open Target</span>
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {captchas.length === 0 && (
                                <div className="col-span-full p-12 text-center text-gray-500 bg-surface-900 border border-white/10 rounded-xl">
                                    <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                    No pending captchas require attention.
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
