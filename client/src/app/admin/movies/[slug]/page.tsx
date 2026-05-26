'use client';

export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, ArrowLeft, Plus, X, ChevronDown, ChevronRight, Link, Trash2, ArrowUpDown, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface Country {
    id: string;
    name: string;
    slug: string;
}

interface Episode {
    name: string;
    slug: string;
    filename: string;
    link_embed: string;
    link_m3u8: string;
}

interface ServerData {
    server_name: string;
    isHidden?: boolean;
    server_data: Episode[];
}

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    content: string;
    type: string;
    status: string;
    thumb_url: string;
    poster_url: string;
    trailer_url: string;
    time: string;
    episode_current: string;
    episode_total: string;
    quality: string;
    lang: string;
    year: number;
    view: number;
    actor: string[];
    director: string[];
    category: Category[];
    country: Country[];
    episodes: ServerData[];
    isFeatured: boolean;
    isActive: boolean;
    mkvUrl?: string;
}

interface EditMoviePageProps {
    params: Promise<{ slug: string }>;
}

export default function EditMoviePage({ params }: EditMoviePageProps) {
    const { slug } = use(params);
    const router = useRouter();

    const [movie, setMovie] = useState<Movie | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        origin_name: '',
        content: '',
        type: '',
        status: '',
        thumb_url: '',
        poster_url: '',
        trailer_url: '',
        time: '',
        episode_current: '',
        episode_total: '',
        quality: '',
        lang: '',
        year: 2024,
        mkvUrl: ''
    });

    const [actors, setActors] = useState<string[]>([]);
    const [directors, setDirectors] = useState<string[]>([]);
    const [newActor, setNewActor] = useState('');
    const [newDirector, setNewDirector] = useState('');
    const [episodes, setEpisodes] = useState<ServerData[]>([]);
    const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

    const fetchMovieDetail = useCallback(async () => {
        try {
            setLoading(true);
            const res = await customFetch(`/api/admin/movies/${slug}`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                const movieData = data.data;
                setMovie(movieData);
                setFormData({
                    name: movieData.name || '',
                    origin_name: movieData.origin_name || '',
                    content: movieData.content || '',
                    type: movieData.type || '',
                    status: movieData.status || '',
                    thumb_url: movieData.thumb_url || '',
                    poster_url: movieData.poster_url || '',
                    trailer_url: movieData.trailer_url || '',
                    time: movieData.time || '',
                    episode_current: movieData.episode_current || '',
                    episode_total: movieData.episode_total || '',
                    quality: movieData.quality || '',
                    lang: movieData.lang || '',
                    year: movieData.year || 2024,
                    mkvUrl: movieData.mkvUrl || ''
                });
                setActors(movieData.actor || []);
                setDirectors(movieData.director || []);
                setEpisodes(movieData.episodes || []);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Fetch movie error:', error);
            toast.error('Lỗi khi tải thông tin phim');
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchMovieDetail();
    }, [fetchMovieDetail]);

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addActor = () => {
        if (newActor.trim() && !actors.includes(newActor.trim())) {
            setActors([...actors, newActor.trim()]);
            setNewActor('');
        }
    };

    const removeActor = (actor: string) => {
        setActors(actors.filter(a => a !== actor));
    };

    const addDirector = () => {
        if (newDirector.trim() && !directors.includes(newDirector.trim())) {
            setDirectors([...directors, newDirector.trim()]);
            setNewDirector('');
        }
    };

    const removeDirector = (director: string) => {
        setDirectors(directors.filter(d => d !== director));
    };

    const handleEpisodeFieldChange = (serverIdx: number, epIdx: number, field: 'name' | 'link_m3u8' | 'link_embed', value: string) => {
        setEpisodes(prev => {
            const next = prev.map((s, si) => {
                if (si !== serverIdx) return s;
                return {
                    ...s,
                    server_data: s.server_data.map((ep, ei) => {
                        if (ei !== epIdx) return ep;
                        return { ...ep, [field]: value };
                    })
                };
            });
            return next;
        });
    };

    const removeEpisode = (serverIdx: number, epIdx: number) => {
        if (confirm('Bạn có chắc chắn muốn xóa tập phim này?')) {
            setEpisodes(prev => {
                const next = [...prev];
                next[serverIdx] = {
                    ...next[serverIdx],
                    server_data: next[serverIdx].server_data.filter((_, i) => i !== epIdx)
                };
                return next;
            });
        }
    };

    const toggleServer = (name: string) => {
        setExpandedServers(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const removeServer = (serverName: string) => {
        if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ tập phim của server "${serverName}" không?`)) {
            setEpisodes(prev => prev.filter(s => s.server_name !== serverName));
            setExpandedServers(prev => {
                const next = new Set(prev);
                next.delete(serverName);
                return next;
            });
        }
    };

    const toggleHideServer = (serverIdx: number) => {
        setEpisodes(prev => {
            const next = [...prev];
            next[serverIdx] = {
                ...next[serverIdx],
                isHidden: !next[serverIdx].isHidden
            };
            return next;
        });
    };

    const addEpisode = (serverIdx: number) => {
        setEpisodes(prev => {
            const next = [...prev];
            next[serverIdx] = {
                ...next[serverIdx],
                server_data: [
                    ...next[serverIdx].server_data,
                    { name: '', slug: '', filename: '', link_embed: '', link_m3u8: '' }
                ]
            };
            return next;
        });
    };

    const addServer = (serverName: string) => {
        if (!serverName.trim()) return;
        if (episodes.some(s => s.server_name === serverName.trim())) {
            toast.error(`Server "${serverName}" đã tồn tại!`);
            return;
        }
        setEpisodes(prev => [...prev, { server_name: serverName.trim(), server_data: [] }]);
        setExpandedServers(prev => {
            const next = new Set(prev);
            next.add(serverName.trim());
            return next;
        });
        toast.success(`Đã thêm server "${serverName}"`);
    };

    const sortEpisodes = (serverIdx: number) => {
        setEpisodes(prev => {
            const next = [...prev];
            const sortedData = [...next[serverIdx].server_data].sort((a, b) => {
                const extractNum = (str: string) => {
                    if (!str) return 0;
                    const m = str.match(/(\d+)/);
                    return m ? parseInt(m[1]) : 0;
                };
                return extractNum(a.name) - extractNum(b.name);
            });
            next[serverIdx] = {
                ...next[serverIdx],
                server_data: sortedData
            };
            return next;
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Auto sort episodes before saving
            const sortedEpisodes = episodes.map(s => {
                const sortedData = [...s.server_data].sort((a, b) => {
                    return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
                });
                return { ...s, server_data: sortedData };
            });

            const updateData = {
                ...formData,
                actor: actors,
                director: directors,
                // Keep existing category, country, use edited episodes
                ...(movie && {
                    category: movie.category,
                    country: movie.country,
                    episodes: sortedEpisodes
                })
            };

            const res = await customFetch(`/api/admin/movies/${slug}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });

            const data = await res.json();

            if (data.success) {
                toast.success('Đã cập nhật phim thành công!');
                router.push('/admin/movies');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Lỗi khi lưu thông tin phim');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-white">Không tìm thấy phim</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/admin/movies')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                    <h1 className="text-2xl font-bold text-white">Chỉnh sửa phim</h1>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Lưu thay đổi
                </Button>
            </div>

            <div className="space-y-6">
                {/* Basic Info */}
                <div className="bg-surface-900 rounded-lg p-6 space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Thông tin cơ bản</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Tên phim</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Tên gốc</label>
                            <Input
                                value={formData.origin_name}
                                onChange={(e) => handleInputChange('origin_name', e.target.value)}
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Mô tả</label>
                        <Textarea
                            value={formData.content}
                            onChange={(e) => handleInputChange('content', e.target.value)}
                            className="bg-surface-800 border-white/10 text-white min-h-30"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">URL Thumb</label>
                            <Input
                                value={formData.thumb_url}
                                onChange={(e) => handleInputChange('thumb_url', e.target.value)}
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">URL Poster</label>
                            <Input
                                value={formData.poster_url}
                                onChange={(e) => handleInputChange('poster_url', e.target.value)}
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">URL Trailer</label>
                        <Input
                            value={formData.trailer_url}
                            onChange={(e) => handleInputChange('trailer_url', e.target.value)}
                            className="bg-surface-800 border-white/10 text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Link cào 4K trực tiếp (mkvdrama.net / mkvdrama.org)</label>
                        <Input
                            value={formData.mkvUrl}
                            onChange={(e) => handleInputChange('mkvUrl', e.target.value)}
                            placeholder="Ví dụ: https://mkvdrama.net/760409-pursuit-of-jade"
                            className="bg-surface-800 border-white/10 text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">Nhập liên kết này để robot cào thẳng các tập 4K hằng ngày từ link này mà không cần dò tìm tên.</p>
                    </div>
                </div>

                {/* Movie Details */}
                <div className="bg-surface-900 rounded-lg p-6 space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Chi tiết phim</h2>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Loại</label>
                            <select
                                value={formData.type}
                                onChange={(e) => handleInputChange('type', e.target.value)}
                                className="w-full bg-surface-800 border border-white/10 text-white rounded-md px-3 py-2"
                            >
                                <option value="">Chọn loại</option>
                                <option value="series">Phim bộ</option>
                                <option value="single">Phim lẻ</option>
                                <option value="hoathinh">Hoạt hình</option>
                                <option value="tvshows">TV Shows</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Trạng thái</label>
                            <select
                                value={formData.status}
                                onChange={(e) => handleInputChange('status', e.target.value)}
                                className="w-full bg-surface-800 border border-white/10 text-white rounded-md px-3 py-2"
                            >
                                <option value="">Chọn trạng thái</option>
                                <option value="completed">Hoàn thành</option>
                                <option value="ongoing">Đang chiếu</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Năm</label>
                            <Input
                                type="number"
                                value={formData.year}
                                onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Thời lượng</label>
                            <Input
                                value={formData.time}
                                onChange={(e) => handleInputChange('time', e.target.value)}
                                placeholder="90 phút"
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Tập hiện tại</label>
                            <Input
                                value={formData.episode_current}
                                onChange={(e) => handleInputChange('episode_current', e.target.value)}
                                placeholder="Tập 10"
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Tổng số tập</label>
                            <Input
                                value={formData.episode_total}
                                onChange={(e) => handleInputChange('episode_total', e.target.value)}
                                placeholder="20"
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Chất lượng</label>
                            <Input
                                value={formData.quality}
                                onChange={(e) => handleInputChange('quality', e.target.value)}
                                placeholder="HD, FHD, 4K"
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Ngôn ngữ</label>
                            <Input
                                value={formData.lang}
                                onChange={(e) => handleInputChange('lang', e.target.value)}
                                placeholder="Vietsub, Thuyết minh"
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Actors */}
                <div className="bg-surface-900 rounded-lg p-6 space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Diễn viên</h2>

                    <div className="flex gap-2">
                        <Input
                            value={newActor}
                            onChange={(e) => setNewActor(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addActor()}
                            placeholder="Nhập tên diễn viên..."
                            className="bg-surface-800 border-white/10 text-white"
                        />
                        <Button onClick={addActor}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {actors.map((actor, index) => (
                            <div
                                key={index}
                                className="bg-surface-800 text-white px-3 py-2 rounded-lg flex items-center gap-2"
                            >
                                <span>{actor}</span>
                                <button
                                    onClick={() => removeActor(actor)}
                                    className="hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {actors.length === 0 && (
                            <p className="text-gray-500 text-sm">Chưa có diễn viên</p>
                        )}
                    </div>
                </div>

                {/* Directors */}
                <div className="bg-surface-900 rounded-lg p-6 space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Đạo diễn</h2>

                    <div className="flex gap-2">
                        <Input
                            value={newDirector}
                            onChange={(e) => setNewDirector(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addDirector()}
                            placeholder="Nhập tên đạo diễn..."
                            className="bg-surface-800 border-white/10 text-white"
                        />
                        <Button onClick={addDirector}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {directors.map((director, index) => (
                            <div
                                key={index}
                                className="bg-surface-800 text-white px-3 py-2 rounded-lg flex items-center gap-2"
                            >
                                <span>{director}</span>
                                <button
                                    onClick={() => removeDirector(director)}
                                    className="hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {directors.length === 0 && (
                            <p className="text-gray-500 text-sm">Chưa có đạo diễn</p>
                        )}
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-surface-900 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Thể loại</h2>
                        <div className="flex flex-wrap gap-2">
                            {movie.category?.map((cat) => (
                                <div key={cat.id} className="bg-surface-800 text-white px-3 py-2 rounded-lg">
                                    {cat.name}
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-500 text-sm mt-3">Cập nhật thể loại từ crawler</p>
                    </div>

                    <div className="bg-surface-900 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Quốc gia</h2>
                        <div className="flex flex-wrap gap-2">
                            {movie.country?.map((country) => (
                                <div key={country.id} className="bg-surface-800 text-white px-3 py-2 rounded-lg">
                                    {country.name}
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-500 text-sm mt-3">Cập nhật quốc gia từ crawler</p>
                    </div>
                </div>

                {/* Episodes - Full editable */}
                <div className="bg-surface-900 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Link className="w-5 h-5 text-primary" />
                        Tập phim
                        <span className="text-sm text-gray-500 font-normal ml-2">({episodes.reduce((acc, s) => acc + s.server_data.length, 0)} tập)</span>
                    </h2>
                    <div className="space-y-3">
                        {episodes.map((server, si) => (
                            <div key={si} className="border border-white/10 rounded-lg overflow-hidden">
                                <div className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/8 transition-colors">
                                    <button
                                        onClick={() => toggleServer(server.server_name)}
                                        className="flex items-center gap-2 flex-1 text-left"
                                    >
                                        {expandedServers.has(server.server_name)
                                            ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                            : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                        <span className="font-bold text-white text-sm">{server.server_name}</span>
                                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{server.server_data.length} tập</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleHideServer(si); }}
                                        className={`p-1.5 rounded-md transition-colors ml-4 shrink-0 ${server.isHidden ? 'text-gray-500 bg-gray-500/10 hover:bg-gray-500/20' : 'text-green-500 bg-green-500/10 hover:bg-green-500/20'}`}
                                        title={server.isHidden ? "Đang ẩn - Nhấn để hiện" : "Đang hiện - Nhấn để ẩn"}
                                    >
                                        {server.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeServer(server.server_name); }}
                                        className="text-red-500 hover:text-red-400 p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 transition-colors ml-2 shrink-0"
                                        title="Xóa server này"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {expandedServers.has(server.server_name) && (
                                    <div className="overflow-x-auto border-t border-white/5">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-black/20 text-gray-500 text-xs uppercase">
                                                    <th className="px-4 py-2 text-left w-24">Tên tập</th>
                                                    <th className="px-4 py-2 text-left">Link M3U8</th>
                                                    <th className="px-4 py-2 text-left">Link Embed / iFrame</th>
                                                    <th className="px-4 py-2 text-center w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {server.server_data.map((ep, ei) => (
                                                    <tr key={ep.slug || ei} className="hover:bg-white/[0.02]">
                                                        <td className="px-4 py-2">
                                                            <input
                                                                type="text"
                                                                value={ep.name || ''}
                                                                onChange={e => handleEpisodeFieldChange(si, ei, 'name', e.target.value)}
                                                                className="w-full bg-black/30 border border-white/10 text-white font-bold text-xs rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <input
                                                                type="text"
                                                                value={ep.link_m3u8 || ''}
                                                                onChange={e => handleEpisodeFieldChange(si, ei, 'link_m3u8', e.target.value)}
                                                                placeholder="https://... .m3u8"
                                                                className="w-full bg-black/30 border border-white/10 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-primary font-mono"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <input
                                                                type="text"
                                                                value={ep.link_embed || ''}
                                                                onChange={e => handleEpisodeFieldChange(si, ei, 'link_embed', e.target.value)}
                                                                placeholder="https://... embed URL"
                                                                className="w-full bg-black/30 border border-white/10 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-primary font-mono"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button
                                                                onClick={() => removeEpisode(si, ei)}
                                                                className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                                                title="Xóa tập"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="px-4 mt-3 mb-2 flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => addEpisode(si)}
                                                className="flex-1 border-white/10 hover:bg-white/5 text-gray-300"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Thêm tập mới
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => sortEpisodes(si)}
                                                className="flex-1 border-white/10 hover:bg-white/5 text-blue-400 border-blue-400/20 bg-blue-400/5 hover:bg-blue-400/10"
                                                title="Sắp xếp danh sách tập theo thứ tự tên"
                                            >
                                                <ArrowUpDown className="w-4 h-4 mr-2" />
                                                Sắp xếp tự động
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {episodes.length === 0 && (
                            <p className="text-gray-500 text-sm mb-4">Chưa có tập nào</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-white/5">
                            <Button
                                variant="outline"
                                onClick={() => addServer('PChill - Abyss')}
                                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm Server VIP 1 (Abyss)
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => addServer('PChill - Play4Me')}
                                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm Server VIP 2 (Play4Me)
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const name = prompt('Nhập tên Server mới:');
                                    if (name) addServer(name);
                                }}
                                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm Server khác
                            </Button>
                        </div>
                    </div>
                    <p className="text-gray-500 text-xs mt-3">Nhấn vào tên server để mở rộng và sửa link. Bấm “Lưu thay đổi” để lưu toàn bộ.</p>
                </div>
            </div>
        </div>
    );
}
