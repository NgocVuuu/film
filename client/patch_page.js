const fs = require('fs');

const path = 'C:/Users/ADMIN/OneDrive - swqpz/Desktop/film/client/src/app/admin/pipeline/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state
const stateInjection = `    const [crawlingUrl, setCrawlingUrl] = useState(false);

    // Trending/Suggestions State
    const [trendingData, setTrendingData] = useState<any>({ ongoing: [], completed: [], missing: [] });
    const [loadingTrending, setLoadingTrending] = useState(false);`;
content = content.replace("    const [crawlingUrl, setCrawlingUrl] = useState(false);", stateInjection);

// 2. Change activeTab type
content = content.replace(
    "const [activeTab, setActiveTab] = useState<'uploads' | 'extractor'>('uploads');",
    "const [activeTab, setActiveTab] = useState<'uploads' | 'extractor' | 'trending'>('uploads');"
);

// 3. Add fetchTrendingData
const fetchInjection = `    const fetchData = async () => {
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
    }, [activeTab]);`;
content = content.replace(/    const fetchData = async \(\) => \{[\s\S]*?    \};\s*/m, fetchInjection + '\n\n');

// 4. Add Trending tab button
const tabInjection = `            <div className="flex space-x-1 border-b border-white/10 mb-6">
                <button
                    onClick={() => setActiveTab('trending')}
                    className={\`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 \${
                        activeTab === 'trending'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }\`}
                >
                    <span className="text-lg">🔥</span> Khám phá (Trending)
                </button>
                <button
                    onClick={() => setActiveTab('uploads')}`;
content = content.replace(/            <div className="flex space-x-1 border-b border-white\/10 mb-6">\s*<button\s*onClick=\{\(\) => setActiveTab\('uploads'\)\}/m, tabInjection);

// 5. Add Trending tab content at the end
const UIInjection = `                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'trending' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="text-2xl">🔥</span> Gợi ý Phim Trending (từ MkvDrama)
                                </h2>
                                <Button 
                                    size="sm" 
                                    onClick={fetchTrendingData} 
                                    disabled={loadingTrending}
                                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                                >
                                    <RefreshCw className={\`w-4 h-4 mr-2 \${loadingTrending ? 'animate-spin' : ''}\`} />
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
                                            🚨 Cần cập nhật ({trendingData.ongoing?.length || 0})
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-4">Phim đang chiếu lọt top, đã có trong DB của bạn. Hãy kiểm tra và cào thêm tập mới!</p>
                                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                            {trendingData.ongoing?.length === 0 && <p className="text-gray-500 text-sm">Chưa có phim nào cần cập nhật.</p>}
                                            {trendingData.ongoing?.map((m: any) => (
                                                <div key={m._id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex gap-3 hover:border-red-500/50 transition-colors">
                                                    {m.thumb_url && <img src={m.thumb_url} alt={m.english_name} className="w-12 h-16 object-cover rounded" />}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-white text-sm truncate">{m.english_name}</div>
                                                        <div className="text-xs text-gray-400 mt-1">DB: <span className="text-primary font-medium">{m.pchill_movie_id?.name || 'Không rõ'}</span></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 2. Đề xuất cào mới (Missing) */}
                                    <div className="bg-[#111115] border border-yellow-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                                        <h3 className="text-lg font-bold text-yellow-500 mb-4 flex items-center gap-2">
                                            🔥 Đề xuất cào mới ({trendingData.missing?.length || 0})
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
                                            ✅ Đã hoàn thành ({trendingData.completed?.length || 0})
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-4">Phim đã Full trên MkvDrama và bạn cũng đã có. Tốt lắm!</p>
                                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 opacity-70">
                                            {trendingData.completed?.length === 0 && <p className="text-gray-500 text-sm">Trống.</p>}
                                            {trendingData.completed?.map((m: any) => (
                                                <div key={m._id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex gap-3">
                                                    {m.thumb_url && <img src={m.thumb_url} alt={m.english_name} className="w-12 h-16 object-cover rounded grayscale" />}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-white text-sm truncate">{m.english_name}</div>
                                                        <div className="text-xs text-green-500 mt-1">Đã có trong DB</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    )}

                </>`;

content = content.replace(/                                        <\/Button>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*\)\}\s*<\/>/m, UIInjection);

fs.writeFileSync(path, content, 'utf8');
console.log("Patch applied successfully!");
