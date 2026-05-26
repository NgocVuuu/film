'use client';
import { useEffect, useState } from 'react';
import { Play, Loader2, RefreshCw, AlertTriangle, ExternalLink, Image as ImageIcon, ChevronDown, ChevronRight, Link as LinkIcon, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';
import { API_URL } from '@/lib/config';

export default function AdminPipelinePage() {
    const [uploads, setUploads] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'uploads' | 'extractor' | 'vipsync'>('uploads');
    const [loading, setLoading] = useState(true);
    const [groupByMovie, setGroupByMovie] = useState(true);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [uploadStatusFilter, setUploadStatusFilter] = useState<string>('all');

    // Extractor State
    const [extractorUrl, setExtractorUrl] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [extractedLinks, setExtractedLinks] = useState<any[]>([]);
    
    // Bulk Sync State
    const [bulkAbyssText, setBulkAbyssText] = useState('');
    const [bulkAbyssSourceLinksText, setBulkAbyssSourceLinksText] = useState('');
    const [isBulkSyncing, setIsBulkSyncing] = useState(false);

    // Bulk Sync Play4Me State
    const [bulkPlay4MeText, setBulkPlay4MeText] = useState('');
    const [isBulkSyncingPlay4Me, setIsBulkSyncingPlay4Me] = useState(false);

    // Retry Custom Links State
    const [customLinks, setCustomLinks] = useState<Record<string, string>>({});

    // Active ingestion states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
    const [searchingMovies, setSearchingMovies] = useState(false);
    const [mkvUrlInput, setMkvUrlInput] = useState('');
    const [crawlingUrl, setCrawlingUrl] = useState(false);

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

    const handleBulkSync = async () => {
        if (!selectedMovie || !bulkAbyssText.trim()) return;
        
        setIsBulkSyncing(true);
        try {
            const lines = bulkAbyssText.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length === 0) {
                toast.error('Vui lòng nhập danh sách link hoặc ID Abyss');
                setIsBulkSyncing(false);
                return;
            }

            let finalExtractedLinks = extractedLinks || [];
            if (bulkAbyssSourceLinksText.trim()) {
                const sourceLines = bulkAbyssSourceLinksText.split('\n').map(l => l.trim()).filter(Boolean);
                finalExtractedLinks = sourceLines.map((link, idx) => {
                    const epMatch = link.match(/e(\d+)/i) || link.match(/tap-?(\d+)/i) || link.match(/tập[ -]?(\d+)/i);
                    const episode = epMatch ? `Tập ${parseInt(epMatch[1])}` : `Tập ${idx + 1}`;
                    return { episode, link, name: `Episode ${episode}` };
                });
            }

            toast('Bắt đầu đồng bộ hàng loạt. Tiến trình này sẽ chạy ngầm trên server, bạn có thể kiểm tra danh sách phim sau ít phút.', { icon: '🚀', duration: 5000 });
            
            const res = await customFetch('/api/admin/pipeline/abyss-bulk-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    movieId: selectedMovie._id,
                    abyssLines: lines,
                    extractedLinks: finalExtractedLinks
                })
            });
            const data = await res.json();
            
            if (res.ok && data.ok) {
                toast.success(`Đã xử lý đồng bộ thành công! ${data.message || ''}`, { duration: 8000 });
                setBulkAbyssText('');
            } else {
                toast.error(data.error || 'Lỗi khi đồng bộ hàng loạt');
            }
        } catch (e) {
            toast.error('Lỗi kết nối API đồng bộ');
        } finally {
            setIsBulkSyncing(false);
        }
    };

    const handleBulkSyncPlay4Me = async () => {
        if (!selectedMovie || !bulkPlay4MeText.trim()) return;
        
        setIsBulkSyncingPlay4Me(true);
        try {
            const lines = bulkPlay4MeText.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length === 0) {
                toast.error('Vui lòng nhập danh sách link trực tiếp');
                setIsBulkSyncingPlay4Me(false);
                return;
            }

            toast('Bắt đầu đồng bộ hàng loạt lên Play4Me. Tiến trình sẽ chạy ngầm trên server.', { icon: '🚀', duration: 5000 });
            
            const res = await customFetch('/api/admin/pipeline/play4me-bulk-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    movieId: selectedMovie._id,
                    play4meLines: lines,
                    extractedLinks: extractedLinks || []
                })
            });
            const data = await res.json();
            
            if (res.ok && data.ok) {
                toast.success(`Đã gửi yêu cầu đồng bộ Play4Me thành công! ${data.message || ''}`, { duration: 8000 });
                setBulkPlay4MeText('');
            } else {
                toast.error(data.error || 'Lỗi khi đồng bộ hàng loạt Play4Me');
            }
        } catch (e) {
            toast.error('Lỗi kết nối API đồng bộ Play4Me');
        } finally {
            setIsBulkSyncingPlay4Me(false);
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
                <button
                    onClick={() => setActiveTab('vipsync')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                        activeTab === 'vipsync'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    Đồng bộ VIP
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
                                                        <th className="px-6 py-3 font-medium text-gray-400">Subtitle</th>
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
                                                            <td className="px-6 py-3">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                                    u.subtitleStatus === 'completed' ? 'bg-green-500/20 text-green-500' :
                                                                    u.subtitleStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                                                                    u.subtitleStatus === 'processing' ? 'bg-yellow-500/20 text-yellow-500' :
                                                                    'bg-gray-500/20 text-gray-400'
                                                                }`}>
                                                                    {u.subtitleStatus === 'error' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                                    {u.subtitleStatus ? u.subtitleStatus.toUpperCase() : 'PENDING'}
                                                                </span>
                                                                {u.subtitleLog && (
                                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[180px]" title={u.subtitleLog}>{u.subtitleLog}</p>
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
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            const text = links.map((l: any) => l.link).join('\n');
                                                            navigator.clipboard.writeText(text);
                                                            toast.success(`Đã copy ${links.length} link ${host}!`);
                                                        }}
                                                        className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 text-xs h-8"
                                                    >
                                                        Copy Tất Cả ({host})
                                                    </Button>
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
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(link.link);
                                                                    toast.success('Đã copy link!');
                                                                }}
                                                                className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5 whitespace-nowrap"
                                                            >
                                                                Copy
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {activeTab === 'vipsync' && (
                        <div className="bg-surface-900 border border-white/10 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-primary" />
                                Đồng bộ VIP (Abyss & Play4Me)
                            </h2>
                            
                            {!selectedMovie && (
                                <div className="mb-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
                                    <p className="text-sm text-yellow-500 mb-2">💡 Bạn chưa chọn phim!</p>
                                    <p className="text-xs text-yellow-500/70">Vui lòng sử dụng tính năng "Chọn Phim Trong Database" ở khung bên trên cùng để bắt đầu.</p>
                                </div>
                            )}

                            {selectedMovie && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {/* Play4Me Bulk Sync Section */}
                                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6 flex flex-col">
                                        <h3 className="text-lg font-bold text-purple-400 mb-2">Đồng bộ Play4Me (Remote Upload)</h3>
                                        <p className="text-sm text-purple-300/70 mb-4">
                                            Phim đang chọn: <strong className="text-white">{selectedMovie.name}</strong><br/>
                                            Dán Direct Link (Gofile, Pixeldrain...) để đẩy lên Play4Me.
                                        </p>
                                        <textarea
                                            value={bulkPlay4MeText}
                                            onChange={(e) => setBulkPlay4MeText(e.target.value)}
                                            placeholder="https://gofile.io/d/abc...&#10;https://pixeldrain.com/u/xyz..."
                                            className="w-full flex-1 min-h-[200px] bg-black/40 border border-purple-500/30 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-purple-400 mb-4 custom-scrollbar"
                                        />
                                        <Button
                                            onClick={handleBulkSyncPlay4Me}
                                            disabled={isBulkSyncingPlay4Me || !bulkPlay4MeText.trim()}
                                            className="bg-purple-600 hover:bg-purple-500 text-white w-full"
                                        >
                                            {isBulkSyncingPlay4Me ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Remote Upload Play4Me</>}
                                        </Button>
                                    </div>

                                    {/* Bulk Sync Section */}
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 flex flex-col">
                                        <h3 className="text-lg font-bold text-blue-400 mb-2">Đồng bộ Abyss (Bulk Sync)</h3>
                                        <p className="text-sm text-blue-300/70 mb-4">
                                            Phim đang chọn: <strong className="text-white">{selectedMovie.name}</strong><br/>
                                            Dán Abyss ID (YawKPXtB8) hoặc Link để đồng bộ & tự up phụ đề.
                                        </p>
                                        <div className="flex gap-4 mb-4 flex-col lg:flex-row">
                                            <div className="flex-1">
                                                <p className="text-xs text-blue-400 mb-1 font-bold">Abyss IDs / Links</p>
                                                <textarea
                                                    value={bulkAbyssText}
                                                    onChange={(e) => setBulkAbyssText(e.target.value)}
                                                    placeholder="YawKPXtB8&#10;https://abyss.to/xxxx..."
                                                    className="w-full min-h-[200px] bg-black/40 border border-blue-500/30 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-400 custom-scrollbar"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-blue-400 mb-1 font-bold">Link gốc (Direct Links) để lấy Sub</p>
                                                <textarea
                                                    value={bulkAbyssSourceLinksText}
                                                    onChange={(e) => setBulkAbyssSourceLinksText(e.target.value)}
                                                    placeholder="https://.../video.mp4&#10;Dán theo đúng thứ tự tập của Abyss để tách phụ đề tự động"
                                                    className="w-full min-h-[200px] bg-black/40 border border-blue-500/30 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-400 custom-scrollbar"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleBulkSync}
                                            disabled={isBulkSyncing || !bulkAbyssText.trim()}
                                            className="bg-blue-600 hover:bg-blue-500 text-white w-full"
                                        >
                                            {isBulkSyncing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Đồng bộ & Up Phụ Đề</>}
                                        </Button>
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
