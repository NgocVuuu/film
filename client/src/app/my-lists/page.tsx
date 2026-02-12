'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Film, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { customFetch } from '@/lib/api';
import toast from 'react-hot-toast';

interface MovieList {
    _id: string;
    name: string;
    slug: string;
    count: number;
    createdAt: string;
    thumbnails?: string[];
}

export default function MyListsPage() {
    const [lists, setLists] = useState<MovieList[]>([]);
    const [loading, setLoading] = useState(true);
    const [newListName, setNewListName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    useEffect(() => {
        fetchLists();
    }, []);

    const fetchLists = async () => {
        try {
            const res = await customFetch('/api/lists');
            const data = await res.json();
            if (data.success) {
                setLists(data.lists);
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi tải danh sách');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        setIsCreating(true);
        try {
            const res = await customFetch('/api/lists', {
                method: 'POST',
                body: JSON.stringify({ name: newListName })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã tạo danh sách mới');
                setNewListName('');
                setShowCreateDialog(false);
                fetchLists();
            } else {
                toast.error(data.message || 'Lỗi tạo danh sách');
            }
        } catch {
            toast.error('Lỗi kết nối');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteList = async (id: string, e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation
        if (!confirm('Bạn có chắc muốn xóa danh sách này?')) return;
        
        try {
            const res = await customFetch(`/api/lists/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã xóa danh sách');
                setLists(lists.filter(l => l._id !== id));
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error('Lỗi xóa danh sách');
        }
    };

    if (loading) {
        return <div className="min-h-screen pt-24 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-deep-black text-foreground pt-24 pb-20">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <Film className="w-8 h-8 text-primary" />
                        Danh sách của tôi
                    </h1>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-gold-600 text-black font-bold">
                                <Plus className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">Tạo danh sách</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-surface-900 border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle>Tạo danh sách mới</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                    Nhập tên cho danh sách phim mới của bạn.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Input 
                                    placeholder="Tên danh sách (VD: Phim hành động hay)" 
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white"
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateList} disabled={isCreating || !newListName.trim()} className="bg-primary text-black">
                                    {isCreating ? <Loader2 className="animate-spin w-4 h-4" /> : 'Tạo ngay'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {lists.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <Film className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg">Bạn chưa có danh sách nào.</p>
                        <Button onClick={() => setShowCreateDialog(true)} variant="link" className="text-primary">
                            Tạo danh sách đầu tiên
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {lists.map(list => (
                            <Link 
                                key={list._id} 
                                href={`/my-lists/${list._id}`}
                                className="group relative block aspect-video rounded-xl overflow-hidden bg-surface-900 border border-white/10 hover:border-primary/50 transition-all shadow-lg hover:shadow-primary/10"
                            >
                                {/* Background Thumbnails Grid - Collage Effect */}
                                <div className="absolute inset-0 grid grid-cols-2 gap-0.5 opacity-60 group-hover:opacity-40 transition-opacity bg-surface-800">
                                    {[0, 1, 2, 3].map((index) => (
                                        <div key={index} className="relative w-full h-full bg-surface-800 overflow-hidden">
                                            {list.thumbnails && list.thumbnails[index] ? (
                                                <img 
                                                    src={list.thumbnails[index]} 
                                                    alt="" 
                                                    className="w-full h-full object-cover opacity-80"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                    <Film className="w-8 h-8 text-white/10" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Gradient Overlay & Content */}
                                <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent flex flex-col justify-end p-3 md:p-4">
                                    <div className="flex items-end justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-base md:text-lg truncate group-hover:text-primary transition-colors mb-0.5 md:mb-1">{list.name}</h3>
                                            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-gray-300">
                                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-white/90 font-medium">{list.count} phim</span>
                                                <span className="text-gray-500">•</span>
                                                <span className="text-gray-400">{new Date(list.createdAt).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDeleteList(list._id, e)}
                                            className="text-white/50 hover:text-red-500 transition-colors p-1.5 md:p-2 hover:bg-white/10 rounded-full shrink-0 z-10"
                                            title="Xóa danh sách"
                                        >
                                            <Trash2 className="w-4 h-4 md:w-5 md:h-5 " />
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
