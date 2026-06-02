'use client';
import { useEffect, useState } from 'react';
import { Play, Loader2, RefreshCw, AlertTriangle, ExternalLink, Image as ImageIcon, ChevronDown, ChevronRight, Link as LinkIcon, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';
import { API_URL } from '@/lib/config';

export default function AdminPipelinePage() {
    const [uploads, setUploads] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'uploads' | 'extractor' | 'trending'>('uploads');
    const [loading, setLoading] = useState(true);
    const [groupByMovie, setGroupByMovie] = useState(true);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [uploadStatusFilter, setUploadStatusFilter] = useState<string>('all');

    // Extractor State
    const [extractorUrl, setExtractorUrl] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [extractedLinks, setExtractedLinks] = useState<any[]>([]);
    
    // Bulk Sync State
    const [bulkSeekstreamingText, setBulkSeekstreamingText] = useState('');
    const [bulkPlay4meText, setBulkPlay4meText] = useState('');
    const [isBulkSyncingSeek, setIsBulkSyncingSeek] = useState(false);
    const [isBulkSyncingPlay, setIsBulkSyncingPlay] = useState(false);

    // Retry Custom Links State
    const [customLinks, setCustomLinks] = useState<Record<string, string>>({});

    // Active ingestion states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
    const [searchingMovies, setSearchingMovies] = useState(false);
    const [mkvUrlInput, setMkvUrlInput] = useState('');
    const [crawlingUrl, setCrawlingUrl] = useState(false);

    // Trending/Suggestions State
    const [trendingData, setTrendingData] = useState<any>({ ongoing: [], completed: [], missing: [] });
    const [loadingTrending, setLoadingTrending] = useState(false);

    // Auto download failed subtitles
    useEffect(() => {
        uploads.forEach(u => {
            if ((u.subtitleStatus === 'failed' || u.subtitleStatus === 'error') && u.subtitleLog?.includes('http')) {
                const storageKey = `downloaded_sub_${u._id}`;
                if (!localStorage.getItem(storageKey)) {
                    localStorage.setItem(storageKey, 'true');
                    const urlMatch = u.subtitleLog.match(new RegExp('https?://[^\\\\s]+'));
                    if (urlMatch && urlMatch[0]) {
                        let downloadUrl = urlMatch[0];
                        // Add Cloudinary attachment flag to force download instead of viewing in browser
                        if (downloadUrl.includes('/upload/')) {
                            downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
                        }
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.target = '_blank';
                        a.download = `subtitle-${u.episode || u._id}.vtt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        toast.success(`Đang tự động tải phụ đề tập ${u.episode || ''}...`);
                    }
                }
            }
        });
    }, [uploads]);

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
            const res = await customFetch('/api/admin/pipeline/crawl-url', {
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

    const handleBulkSync = async (hostType: 'seekstreaming' | 'play4me') => {
        const textToSync = hostType === 'seekstreaming' ? bulkSeekstreamingText : bulkPlay4meText;
        if (!selectedMovie || !textToSync.trim()) return;
        
        const setSyncing = hostType === 'seekstreaming' ? setIsBulkSyncingSeek : setIsBulkSyncingPlay;
        const apiRoute = hostType === 'seekstreaming' ? '/api/admin/pipeline/seekstreaming-bulk-sync' : '/api/admin/pipeline/play4me-bulk-sync';
        const linesKey = hostType === 'seekstreaming' ? 'seekstreamingLines' : 'play4meLines';
        const hostName = hostType === 'seekstreaming' ? 'Seekstreaming' : 'Play4Me';

        setSyncing(true);
        try {
            const lines = textToSync.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length === 0) {
                toast.error(`Vui lòng nhập danh sách link hoặc ID ${hostName}`);
                setSyncing(false);
                return;
            }

            toast(`Bắt đầu đồng bộ hàng loạt lên ${hostName}. Tiến trình này sẽ chạy ngầm trên server...`, { icon: '🚀', duration: 5000 });
            
            const payload = {
                movieId: selectedMovie._id,
                extractedLinks: extractedLinks || []
            } as any;
            payload[linesKey] = lines;

            const res = await customFetch(apiRoute, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok && data.ok) {
                toast.success(`Đã xử lý đồng bộ thành công! ${data.message || ''}`, { duration: 8000 });
                if (hostType === 'seekstreaming') setBulkSeekstreamingText('');
                else setBulkPlay4meText('');
            } else {
                toast.error(data.error || `Lỗi khi đồng bộ hàng loạt lên ${hostName}`);
            }
        } catch (e) {
            toast.error('Lỗi kết nối API đồng bộ');
        } finally {
            setSyncing(false);
        }
    };

    const handleExtractorUpload = async (links: any[], hosts: string[]) => {
        if (!selectedMovie) {
            toast.error('Vui lòng tìm và chọn Phim ở ô trên cùng trước!');
            return;
        }
        try {
            const res = await customFetch('/api/admin/pipeline/extractor-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    movieId: selectedMovie._id,
                    links,
                    hosts
                })
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                toast.success(data.message || 'Đã gửi lệnh upload thành công!');
                setActiveTab('uploads');
                fetchData();
            } else {
                toast.error(data.error || 'Lỗi khi đồng bộ!');
            }
        } catch (e) {
            toast.error('Lỗi kết nối tới Server!');
        }
    };

    const fetchData = async () => {
        try {
            const resUp = await customFetch('/api/admin/pipeline/uploads?limit=200');
            const dataUp = await resUp.json();
            if (resUp.ok) setUploads(dataUp);
        } catch (e: any) {
            console.warn('Fetch error (server might be restarting):', e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTrendingData = async () => {
        try {
            setLoadingTrending(true);
            const res = await customFetch('/api/admin/pipeline/suggestions');
            const data = await res.json();
            if (res.ok && data.success) {
                setTrendingData(data.data);
            }
        } catch (e) {
            console.error('Lỗi khi fetch trending:', e);
        } finally {
            setLoadingTrending(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'trending') {
            fetchTrendingData();
        }
    }, [activeTab]);

useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRetry = async (id: string) => {
        const customLink = customLinks[id] || '';
        
        try {
            await customFetch(`/api/admin/pipeline/uploads/${id}/retry`, { 
                method: 'POST',
                body: JSON.stringify({ customLink: customLink.trim() })
            });
            toast.success(customLink.trim() ? 'Đang xử lý link tuỳ chỉnh' : 'Đã đưa vào hàng chờ thử lại tự động');
            setCustomLinks(prev => ({ ...prev, [id]: '' })); // Reset input
            fetchData();
        } catch (e) {
            toast.error('Failed to retry');
        }
    };

    const handleCancel = async (id: string) => {
        if (!window.confirm("Bạn có chắc muốn ép huỷ task đang kẹt này để thử lại không?")) return;
        
        try {
            await customFetch(`/api/admin/pipeline/uploads/${id}/cancel`, { 
                method: 'POST'
            });
            toast.success('Đã huỷ task thành công. Giờ bạn có thể Retry!');
            fetchData();
        } catch (e) {
            toast.error('Failed to cancel');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Bạn có chắc muốn xoá hoàn toàn task này khỏi database không? Hành động này không thể hoàn tác.")) return;
        
        try {
            await customFetch(`/api/admin/pipeline/uploads/${id}`, { 
                method: 'DELETE'
            });
            toast.success('Đã xoá task thành công!');
            fetchData();
        } catch (e) {
            toast.error('Failed to delete task');
        }
    };

    const handleExtractLinks = async (sourceUrl: string, id?: string) => {
        if (!sourceUrl && !id) return;
        
        setActiveTab('extractor');
        setExtractorUrl(sourceUrl);
        setExtracting(true);
        setExtractedLinks([]);

        try {
            toast('Đang chạy Puppeteer quét link. Vui lòng đợi ~15s...', { icon: 'ℹ️' });
            const payload = id ? { id } : { movieUrl: sourceUrl };
            const res = await customFetch(`/api/admin/pipeline/extract-links`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.ok && data.detailedLinks) {
                setExtractedLinks(data.detailedLinks);
                toast.success(`Đã lấy thành công ${data.detailedLinks.length} link chi tiết!`);
            } else {
                toast.error(data.error || 'Không tìm thấy link nào');
            }
        } catch (e) {
            toast.error('Lỗi khi lấy link');
        } finally {
            setExtracting(false);
        }
    };

    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // Group uploads by series name
    const groupedUploads = (() => {
        const filtered = uploadStatusFilter === 'all' ? uploads : uploads.filter(u => u.status === uploadStatusFilter);
        if (!groupByMovie) return [{ key: 'all', label: 'Tất cả', items: filtered }];
        const map = new Map<string, any[]>();
        filtered.forEach(u => {
            const key = u.series || 'Chưa phân loại';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(u);
        });
        return Array.from(map.entries()).map(([key, items]) => ({ key, label: key, items }));
    })();

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Play className="w-6 h-6 text-primary" />
                    Auto Pipeline
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setGroupByMovie(g => !g)}
                        className={`px-3 py-1.5 text-xs rounded-lg border font-bold transition-colors ${
                            groupByMovie
                                ? 'bg-primary/20 border-primary/30 text-primary'
                                : 'border-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                        Nhóm theo phim
                    </button>
                </div>
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
                    onClick={() => setActiveTab('trending')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                        activeTab === 'trending'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    Khám phá (Trending)
                </button>
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
                    onClick={() => setActiveTab('extractor')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                        activeTab === 'extractor'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    Link Extractor
                </button>
            </div>

            {loading && uploads.length === 0 ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {activeTab === 'uploads' && (
                        <div className="space-y-3">
                            {/* Status filter */}
                            <div className="flex items-center gap-2">
                                {['all', 'pending', 'processing', 'completed', 'failed'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setUploadStatusFilter(s)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                                            uploadStatusFilter === s
                                                ? s === 'failed' ? 'bg-red-500 border-red-500 text-white'
                                                    : s === 'completed' ? 'bg-green-500 border-green-500 text-white'
                                                    : 'bg-primary border-primary text-black'
                                                : 'border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {s === 'all' ? `Tất cả (${uploads.length})` : s.toUpperCase()}
                                        {s !== 'all' && ` (${uploads.filter(u => u.status === s).length})`}
                                    </button>
                                ))}
                            </div>

                            {/* Grouped table */}
                            {groupedUploads.map(group => (
                                <div key={group.key} className="bg-surface-900 border border-white/10 rounded-xl overflow-hidden">
                                    {groupByMovie && (
                                        <button
                                            onClick={() => toggleGroup(group.key)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                {collapsedGroups.has(group.key)
                                                    ? <ChevronRight className="w-4 h-4 text-gray-400" />
                                                    : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                <span className="font-bold text-white text-sm truncate max-w-xs">{group.label}</span>
                                                <span className="text-xs text-gray-500">({group.items.length} tập)</span>
                                            </div>
                                            <div className="flex gap-1.5">
                                                {['failed', 'processing', 'pending', 'completed'].map(s => {
                                                    const cnt = group.items.filter(i => i.status === s).length;
                                                    if (!cnt) return null;
                                                    return <span key={s} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        s === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                        s === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                        'bg-yellow-500/20 text-yellow-400'
                                                    }`}>{s} {cnt}</span>;
                                                })}
                                            </div>
                                        </button>
                                    )}

                                    {!collapsedGroups.has(group.key) && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-white/5 border-b border-white/10">
                                                    <tr>
                                                        <th className="px-6 py-3 font-medium text-gray-400">File / Episode</th>
                                                        {!groupByMovie && <th className="px-6 py-3 font-medium text-gray-400">Series</th>}
                                                        <th className="px-6 py-3 font-medium text-gray-400">Host</th>
                                                        <th className="px-6 py-3 font-medium text-gray-400">Status</th>

                                                        <th className="px-6 py-3 font-medium text-gray-400">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {group.items.map((u) => (
                                                        <tr key={u._id} className={`hover:bg-white/5 transition-colors ${
                                                            u.status === 'failed' ? 'bg-red-500/5' : ''
                                                        }`}>
                                                            <td className="px-6 py-3">
                                                                <div className="font-medium text-white truncate max-w-xs" title={u.filename || 'N/A'}>
                                                                    {u.filename || 'N/A'}
                                                                </div>
                                                                <div className="text-gray-400 text-xs mt-0.5">
                                                                    SS{u.season} - EP{u.episode}
                                                                </div>
                                                            </td>
                                                            {!groupByMovie && <td className="px-6 py-3 text-gray-400 text-xs">{u.series}</td>}
                                                            <td className="px-6 py-3">
                                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white/10 text-gray-300">
                                                                    {u.host}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                                    u.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                                                    u.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                                    'bg-yellow-500/20 text-yellow-500'
                                                                }`}>
                                                                    {u.status === 'failed' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                                    {u.status.toUpperCase()}
                                                                </span>
                                                                {u.notes && (
                                                                    <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-[180px]" title={u.notes}>{u.notes}</p>
                                                                )}
                                                            </td>

                                                            <td className="px-6 py-3 flex items-center space-x-2">
                                                                {u.status === 'failed' && (
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Link tuỳ chọn (trống = tự động)"
                                                                        value={customLinks[u._id] || ''}
                                                                        onChange={(e) => setCustomLinks(prev => ({ ...prev, [u._id]: e.target.value }))}
                                                                        className="bg-black/40 border border-red-500/30 text-xs px-2 py-1.5 rounded focus:outline-none focus:border-red-400 w-48 text-white placeholder-gray-500"
                                                                    />
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleRetry(u._id)}
                                                                    className={`border ${
                                                                        u.status === 'failed'
                                                                            ? 'border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-400'
                                                                            : 'border-white/10 text-gray-400 hover:bg-primary/20 hover:text-primary'
                                                                    }`}
                                                                >
                                                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                                                    Retry
                                                                </Button>

                                                                {u.status === 'processing' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleCancel(u._id)}
                                                                        className="border border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-400"
                                                                        title="Ép huỷ task đang kẹt để làm lại"
                                                                    >
                                                                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                                                        Huỷ
                                                                    </Button>
                                                                )}

                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleDelete(u._id)}
                                                                    className="border border-red-900/50 text-red-500 hover:bg-red-500/20 hover:border-red-500"
                                                                    title="Xoá task này"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {group.items.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-6 text-center text-gray-500 text-sm">
                                                                Không có tập nào.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {groupedUploads.length === 0 && (
                                <div className="bg-surface-900 border border-white/10 rounded-xl p-12 text-center text-gray-500">
                                    No uploads found in the pipeline.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'extractor' && (
                        <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <LinkIcon className="w-5 h-5 text-primary" />
                                Công cụ bóc tách Link (Link Extractor)
                            </h2>
                            <p className="text-sm text-gray-400 mb-6">
                                Công cụ này cho phép bạn điền link phim (Mkvdrama, Viewcrate, Gofile...) để nó tự động vượt qua Captcha/Ouo, chui vào tận nơi bóc ra link gốc của từng tập phim. Giúp bạn dễ dàng copy để Retry.
                            </p>

                            <div className="flex gap-4 mb-8">
                                <input
                                    type="text"
                                    value={extractorUrl}
                                    onChange={(e) => setExtractorUrl(e.target.value)}
                                    placeholder="Nhập link phim..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                                />
                                <Button 
                                    onClick={() => handleExtractLinks(extractorUrl)}
                                    disabled={extracting || !extractorUrl.trim()}
                                    className="bg-primary hover:bg-primary-hover text-white"
                                >
                                    {extracting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang bóc tách...</>
                                    ) : (
                                        <><Play className="w-4 h-4 mr-2" /> Bắt đầu bóc</>
                                    )}
                                </Button>
                            </div>

                            {extractedLinks.length > 0 && (() => {
                                const groupedByHost = extractedLinks.reduce((acc, link) => {
                                    let host = 'Others';
                                    if (link.link.includes('pixeldrain.com')) host = 'Pixeldrain';
                                    else if (link.link.includes('gofile.io')) host = 'Gofile';
                                    else if (link.link.includes('send.cm')) host = 'Send.cm';
                                    else if (link.link.includes('send.now')) host = 'Send.now';
                                    
                                    if (!acc[host]) acc[host] = [];
                                    acc[host].push(link);
                                    return acc;
                                }, {} as Record<string, any[]>);

                                return (
                                    <div className="space-y-6">
                                        <h3 className="text-md font-bold text-green-400">Kết quả ({extractedLinks.length} files):</h3>
                                        {Object.entries(groupedByHost).map(([host, links]: [string, any]) => (
                                            <div key={host} className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
                                                <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/5">
                                                    <div className="font-bold text-white flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                                                        {host} <span className="text-gray-400 text-xs font-normal">({links.length} links)</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => handleExtractorUpload(links, ['Play4Me'])} className="bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 border border-pink-500/30 text-[10px] h-7 px-2">Đồng bộ Play4Me</Button>
                                                        <Button size="sm" onClick={() => handleExtractorUpload(links, ['Seekstreaming'])} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 text-[10px] h-7 px-2">Đồng bộ Seek</Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                const text = links.map((l: any) => l.link).join('\n');
                                                                navigator.clipboard.writeText(text);
                                                                toast.success(`Đã copy ${links.length} link ${host}!`);
                                                            }}
                                                            className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 text-xs h-7 px-2"
                                                        >
                                                            Copy Tất Cả ({host})
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                                    {links.map((link: any, idx: number) => (
                                                        <div key={idx} className="bg-black/40 border border-white/5 rounded-lg p-3 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between hover:border-white/10 transition-colors">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-mono text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">
                                                                        {link.episode}
                                                                    </span>
                                                                    <span className="text-white text-sm font-medium truncate" title={link.name}>
                                                                        {link.name}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 truncate" title={link.link}>
                                                                    {link.link}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button size="sm" variant="outline" onClick={() => handleExtractorUpload([link], ['Play4Me'])} className="border-pink-500/30 text-pink-400 hover:bg-pink-500/20 text-[10px] h-7 px-2">Up Play4Me</Button>
                                                                <Button size="sm" variant="outline" onClick={() => handleExtractorUpload([link], ['Seekstreaming'])} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-[10px] h-7 px-2">Up Seek</Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(link.link);
                                                                        toast.success('Đã copy link!');
                                                                    }}
                                                                    className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5 whitespace-nowrap h-7 text-[10px] px-2"
                                                                >
                                                                    Copy
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {/* Đồng bộ Hosts nằm ngay dưới phần Extractor */}
                            {selectedMovie && extractedLinks && extractedLinks.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    {/* SEEKSTREAMING */}
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 flex flex-col">
                                        <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                                            <RefreshCw className="w-5 h-5" />
                                            Đồng bộ Seekstreaming
                                        </h3>
                                        <p className="text-sm text-blue-300/70 mb-4">
                                            Phim đang chọn: <strong className="text-white">{selectedMovie.name}</strong><br/>
                                            Dán Link Seekstreaming để đồng bộ dựa trên các link gốc đã bóc.
                                        </p>
                                        <div className="mb-4">
                                            <p className="text-xs text-blue-400 mb-1 font-bold">Seekstreaming Links</p>
                                            <textarea
                                                value={bulkSeekstreamingText}
                                                onChange={(e) => setBulkSeekstreamingText(e.target.value)}
                                                placeholder="https://seekstreaming.com/..."
                                                className="w-full min-h-[200px] bg-black/40 border border-blue-500/30 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-400 custom-scrollbar"
                                            />
                                        </div>
                                        <Button
                                            onClick={() => handleBulkSync('seekstreaming')}
                                            disabled={isBulkSyncingSeek || !bulkSeekstreamingText.trim()}
                                            className="bg-blue-600 hover:bg-blue-500 text-white w-full"
                                        >
                                            {isBulkSyncingSeek ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Đồng bộ Seekstreaming</>}
                                        </Button>
                                    </div>

                                    {/* PLAY4ME */}
                                    <div className="bg-pink-500/5 border border-pink-500/20 rounded-xl p-6 flex flex-col">
                                        <h3 className="text-lg font-bold text-pink-400 mb-2 flex items-center gap-2">
                                            <RefreshCw className="w-5 h-5" />
                                            Đồng bộ Play4Me
                                        </h3>
                                        <p className="text-sm text-pink-300/70 mb-4">
                                            Phim đang chọn: <strong className="text-white">{selectedMovie.name}</strong><br/>
                                            Dán Link Play4Me để đồng bộ dựa trên các link gốc đã bóc.
                                        </p>
                                        <div className="mb-4">
                                            <p className="text-xs text-pink-400 mb-1 font-bold">Play4Me Links</p>
                                            <textarea
                                                value={bulkPlay4meText}
                                                onChange={(e) => setBulkPlay4meText(e.target.value)}
                                                placeholder="https://player4me.com/..."
                                                className="w-full min-h-[200px] bg-black/40 border border-pink-500/30 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-pink-400 custom-scrollbar"
                                            />
                                        </div>
                                        <Button
                                            onClick={() => handleBulkSync('play4me')}
                                            disabled={isBulkSyncingPlay || !bulkPlay4meText.trim()}
                                            className="bg-pink-600 hover:bg-pink-500 text-white w-full"
                                        >
                                            {isBulkSyncingPlay ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Đồng bộ Play4Me</>}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'trending' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    Gợi ý Phim Trending (từ MkvDrama)
                                </h2>
                                <Button 
                                    size="sm" 
                                    onClick={fetchTrendingData} 
                                    disabled={loadingTrending}
                                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingTrending ? 'animate-spin' : ''}`} />
                                    Làm mới
                                </Button>
                            </div>

                            {loadingTrending && (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            )}

                            {!loadingTrending && (
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    
                                    {/* 1. Phim Ongoing (Cần Cập Nhật) */}
                                    <div className="bg-[#111115] border border-red-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                                        <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                                            Cần cập nhật ({trendingData.ongoing?.length || 0})
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-4">Phim đang chiếu lọt top, đã có trong DB của bạn. Hãy kiểm tra và cào thêm tập mới!</p>
                                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                            {trendingData.ongoing?.length === 0 && <p className="text-gray-500 text-sm">Chưa có phim nào cần cập nhật.</p>}
                                            {trendingData.ongoing?.map((m: any) => {
                                                const play4meCount = m.pchill_movie_id?.episodes?.find((e:any) => e.server_name?.toLowerCase().includes('play4me'))?.server_data?.length || 0;
                                                const seekCount = m.pchill_movie_id?.episodes?.find((e:any) => e.server_name?.toLowerCase().includes('seek'))?.server_data?.length || 0;
                                                
                                                const rawTotal = m.pchill_movie_id?.episode_total || m.pchill_movie_id?.episode_current || '';
                                                const match = String(rawTotal).match(/\d+/);
                                                const totalStr = match ? `/${match[0]}` : '';

                                                return (
                                                    <div key={m._id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex gap-3 hover:border-red-500/50 transition-colors">
                                                        {m.thumb_url && <img src={m.thumb_url} alt={m.english_name} className="w-12 h-16 object-cover rounded" />}
                                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                            <div className="font-bold text-white text-sm truncate">{m.english_name}</div>
                                                            <div className="text-xs text-gray-400 mt-1 truncate">DB: <span className="text-primary font-medium">{m.pchill_movie_id?.name || 'Không rõ'}</span></div>
                                                            <div className="flex gap-2 mt-1.5">
                                                                {play4meCount > 0 ? (
                                                                    <span className="bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">Play4Me: Tập {play4meCount}{totalStr}</span>
                                                                ) : (
                                                                    <span className="bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">Play4Me: 0{totalStr}</span>
                                                                )}
                                                                {seekCount > 0 ? (
                                                                    <span className="bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">Seek: Tập {seekCount}{totalStr}</span>
                                                                ) : (
                                                                    <span className="bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">Seek: 0{totalStr}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 2. Đề xuất cào mới (Missing) */}
                                    <div className="bg-[#111115] border border-yellow-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                                        <h3 className="text-lg font-bold text-yellow-500 mb-4 flex items-center gap-2">
                                            Đề xuất cào mới ({trendingData.missing?.length || 0})
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-4">Các phim cực hot nhưng chưa có trong DB. Copy tên sang tab Upload để cào ngay!</p>
                                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                            {trendingData.missing?.length === 0 && <p className="text-gray-500 text-sm">Không có đề xuất mới.</p>}
                                            {trendingData.missing?.map((m: any) => (
                                                <div key={m._id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex gap-3 hover:border-yellow-500/50 transition-colors">
                                                    {m.thumb_url && <img src={m.thumb_url} alt={m.english_name} className="w-12 h-16 object-cover rounded" />}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                        <div className="font-bold text-white text-sm truncate" title={m.english_name}>{m.english_name}</div>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(m.english_name);
                                                                toast.success('Đã copy tên phim. Hãy dán vào ô Tìm kiếm!');
                                                            }}
                                                            className="h-7 text-xs border-white/10 text-gray-300 hover:text-white mt-2 self-start"
                                                        >
                                                            Copy Tên
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Phim Đã Hoàn Thành */}
                                    <div className="bg-[#111115] border border-green-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                                        <h3 className="text-lg font-bold text-green-500 mb-4 flex items-center gap-2">
                                            Đã hoàn thành ({trendingData.completed?.length || 0})
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-4">Phim đã Full trên MkvDrama và bạn cũng đã có. Tốt lắm!</p>
                                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 opacity-70">
                                            {trendingData.completed?.length === 0 && <p className="text-gray-500 text-sm">Trống.</p>}
                                            {trendingData.completed?.map((m: any) => {
                                                const play4meCount = m.pchill_movie_id?.episodes?.find((e:any) => e.server_name?.toLowerCase().includes('play4me'))?.server_data?.length || 0;
                                                const seekCount = m.pchill_movie_id?.episodes?.find((e:any) => e.server_name?.toLowerCase().includes('seek'))?.server_data?.length || 0;
                                                
                                                const rawTotal = m.pchill_movie_id?.episode_total || m.pchill_movie_id?.episode_current || '';
                                                const match = String(rawTotal).match(/\d+/);
                                                const totalStr = match ? `/${match[0]}` : '';

                                                return (
                                                    <div key={m._id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex gap-3 hover:border-green-500/50 transition-colors">
                                                        {m.thumb_url && <img src={m.thumb_url} alt={m.english_name} className="w-12 h-16 object-cover rounded grayscale hover:grayscale-0 transition-all" />}
                                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                            <div className="font-bold text-white text-sm truncate">{m.english_name}</div>
                                                            <div className="text-xs text-green-500 mt-1 truncate">Đã Full DB: <span className="text-white">{m.pchill_movie_id?.name}</span></div>
                                                            <div className="flex gap-2 mt-1.5 opacity-80">
                                                                {play4meCount > 0 ? (
                                                                    <span className="bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">Play4Me: Tập {play4meCount}{totalStr}</span>
                                                                ) : (
                                                                    <span className="bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">Play4Me: 0{totalStr}</span>
                                                                )}
                                                                {seekCount > 0 ? (
                                                                    <span className="bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">Seek: Tập {seekCount}{totalStr}</span>
                                                                ) : (
                                                                    <span className="bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">Seek: 0{totalStr}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    )}

                </>
            )}
        </div>
    );
}
