'use client';

export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, ArrowLeft, Plus, X } from 'lucide-react';
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
    torrents?: {
        magnet: string;
        quality: string;
        size: string;
        seeders: number;
        isPremiumOnly: boolean;
    }[];
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
        year: 2024
    });

    const [actors, setActors] = useState<string[]>([]);
    const [directors, setDirectors] = useState<string[]>([]);
    const [newActor, setNewActor] = useState('');
    const [newDirector, setNewDirector] = useState('');

    const [torrents, setTorrents] = useState<{
        magnet: string;
        quality: string;
        size: string;
        seeders: number;
        isPremiumOnly: boolean;
    }[]>([]);
    const [newTorrent, setNewTorrent] = useState({
        magnet: '',
        quality: '1080p',
        size: '',
        seeders: 0,
        isPremiumOnly: true
    });

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
                    year: movieData.year || 2024
                });
                setActors(movieData.actor || []);
                setDirectors(movieData.director || []);
                setTorrents(movieData.torrents || []);
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

    const addTorrent = () => {
        if (newTorrent.magnet.trim()) {
            setTorrents([...torrents, newTorrent]);
            setNewTorrent({
                magnet: '',
                quality: '1080p',
                size: '',
                seeders: 0,
                isPremiumOnly: true
            });
        }
    };

    const removeTorrent = (index: number) => {
        setTorrents(torrents.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            const updateData = {
                ...formData,
                actor: actors,
                director: directors,
                torrents: torrents,
                // Keep existing category, country, episodes
                ...(movie && {
                    category: movie.category,
                    country: movie.country,
                    episodes: movie.episodes
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

                {/* Episodes Info */}
                <div className="bg-surface-900 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Tập phim</h2>
                    <div className="space-y-3">
                        {movie.episodes?.map((server, idx) => (
                            <div key={idx} className="bg-surface-800 p-4 rounded-lg">
                                <h3 className="text-white font-semibold mb-2">{server.server_name}</h3>
                                <p className="text-gray-400 text-sm">{server.server_data?.length || 0} tập</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-gray-500 text-sm mt-3">Cập nhật tập phim từ crawler</p>
                </div>

                {/* Torrent Sources */}
                <div className="bg-surface-900 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">Nguồn chất lượng cao (Torrent/Magnet)</h2>
                        <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded font-bold uppercase">Premium Feature</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-800 p-4 rounded-lg border border-white/5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Magnet Link</label>
                            <Input
                                value={newTorrent.magnet}
                                onChange={(e) => setNewTorrent({ ...newTorrent, magnet: e.target.value })}
                                placeholder="magnet:?xt=urn:btih:..."
                                className="bg-surface-900 border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Chất lượng</label>
                            <select
                                value={newTorrent.quality}
                                onChange={(e) => setNewTorrent({ ...newTorrent, quality: e.target.value })}
                                className="w-full bg-surface-900 border border-white/10 text-white rounded-md px-3 py-2"
                            >
                                <option value="1080p">1080p</option>
                                <option value="4K">4K</option>
                                <option value="Bluray">Bluray</option>
                                <option value="Remux">Remux</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Dung lượng</label>
                            <Input
                                value={newTorrent.size}
                                onChange={(e) => setNewTorrent({ ...newTorrent, size: e.target.value })}
                                placeholder="15 GB"
                                className="bg-surface-900 border-white/10 text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Button onClick={addTorrent} className="w-full bg-primary hover:bg-primary/90 text-black font-bold">
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm nguồn Torrent
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3 mt-6">
                        {torrents.map((t, index) => (
                            <div key={index} className="bg-surface-800 p-4 rounded-lg border border-white/5 flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-primary text-black text-[10px] px-2 py-0.5 rounded font-black">{t.quality}</span>
                                        <span className="text-gray-400 text-xs font-mono">{t.size}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm truncate font-mono bg-black/20 p-2 rounded">{t.magnet}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTorrent(index)}
                                    className="text-gray-500 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {torrents.length === 0 && (
                            <div className="text-center py-8 bg-surface-800/50 rounded-lg border border-dashed border-white/10">
                                <p className="text-gray-500 text-sm">Chưa có nguồn Torrent chất lượng cao</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
