'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MovieCard } from '@/components/MovieCard';
import { customFetch } from '@/lib/api';
import toast from 'react-hot-toast';

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    year: number;
    quality: string;
    lang: string;
}

interface MovieList {
    _id: string;
    name: string;
    user: string;
    movies: {
        movie: Movie;
        addedAt: string;
        _id: string;
    }[];
}

export default function ListDetailPage() {
    const params = useParams();
    const router = useRouter();
    const listId = params.id as string;

    const [list, setList] = useState<MovieList | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [savingName, setSavingName] = useState(false);

    useEffect(() => {
        if (listId) fetchList();
    }, [listId]);

    const fetchList = async () => {
        try {
            const res = await customFetch(`/api/lists/${listId}`);
            const data = await res.json();
            if (data.success) {
                setList(data.list);
                setNewName(data.list.name);
            } else {
                toast.error(data.message || 'Không tìm thấy danh sách');
                router.push('/my-lists');
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi tải danh sách');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateName = async () => {
        if (!newName.trim() || newName === list?.name) {
            setIsEditingName(false);
            return;
        }
        setSavingName(true);
        try {
            const res = await customFetch(`/api/lists/${listId}`, {
                method: 'PUT',
                body: JSON.stringify({ name: newName })
            });
            const data = await res.json();
            if (data.success) {
                setList({ ...list!, name: newName });
                toast.success('Đã cập nhật tên');
                setIsEditingName(false);
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error('Lỗi cập nhật');
        } finally {
            setSavingName(false);
        }
    };

    const handleRemoveMovie = async (movieId: string) => {
        if (!confirm('Xóa phim này khỏi danh sách?')) return;
        try {
            const res = await customFetch(`/api/lists/${listId}/movies/${movieId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã xóa phim khỏi danh sách');
                // Optimistic update
                setList(prev => prev ? {
                    ...prev,
                    movies: prev.movies.filter(m => m.movie._id !== movieId)
                } : null);
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error('Lỗi xóa phim');
        }
    };

    if (loading) return <div className="min-h-screen pt-24 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
    if (!list) return null;

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-24 pb-20">
            <div className="container mx-auto px-4">
                <Link href="/my-lists" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại danh sách
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-white/10 pb-6">
                    <div className="flex-1">
                        {isEditingName ? (
                            <div className="flex items-center gap-2 max-w-md">
                                <Input 
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="bg-black/20 text-white border-white/20"
                                    autoFocus
                                />
                                <Button size="icon" onClick={handleUpdateName} disabled={savingName} className="bg-green-500 hover:bg-green-600">
                                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                {list.name}
                                <button 
                                    onClick={() => setIsEditingName(true)}
                                    className="text-gray-500 hover:text-primary transition-colors"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                            </h1>
                        )}
                        <p className="text-gray-400 mt-2">{list.movies.length} phim</p>
                    </div>
                </div>

                {list.movies.length === 0 ? (
                    <div className="text-center py-20 bg-surface-900/50 rounded-xl border border-white/5 border-dashed">
                        <p className="text-gray-500">Danh sách này chưa có phim nào.</p>
                        <Button variant="link" onClick={() => router.push('/')} className="text-primary mt-2">
                            Khám phá phim ngay
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {list.movies.map((item) => (
                            <div key={item._id} className="relative group">
                                <MovieCard movie={item.movie} />
                                <button
                                    onClick={() => handleRemoveMovie(item.movie._id)}
                                    className="absolute top-2 right-2 p-1.5 bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white z-20"
                                    title="Xóa khỏi danh sách"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
