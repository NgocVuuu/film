'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, Loader2 } from 'lucide-react';
import { customFetch } from '@/lib/api';
import toast from 'react-hot-toast';

interface AddToListModalProps {
    isOpen: boolean;
    onClose: () => void;
    movieId: string;
}

interface MovieList {
    _id: string;
    name: string;
    hasMovie: boolean;
}

export function AddToListModal({ isOpen, onClose, movieId }: AddToListModalProps) {
    const [lists, setLists] = useState<MovieList[]>([]);
    const [loading, setLoading] = useState(true);
    const [newListName, setNewListName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (isOpen && movieId) {
            fetchLists();
        }
    }, [isOpen, movieId]);

    const fetchLists = async () => {
        setLoading(true);
        try {
            // Fetch all lists
            const res = await customFetch('/api/lists');
            const data = await res.json();
            
            if (data.success) {
                // For each list, check if movie is in it (we need detailed check or efficient backend check)
                // Since this might be heavy, let's just fetch full details of lists or better:
                // Modify backend to return "hasMovie" flag? 
                // Or just iterate client side if the list count is small. 
                // The backend /api/lists returns basic info. 
                // We'll iterate and check containment implies we need the movie ids in the list.
                // Optimally: Backend should support checking "In which lists is this movie?"
                // Ideally: GET /api/lists?contains_movie=ID
                
                // For now, let's assume we fetch lists, and then for each list we might need to check.
                // But /api/lists strips movies array.
                // Let's rely on user clicking to add.
                // BUT better yet: just fetch all lists with full content for this simple UI? NO.
                // Let's implement a quick client-side check if possible, or update backend API.
                // Let's update backend list controller to support `?contains=movieId`.
                
                // WAIT: I didn't update backend to support efficient checking. 
                // Let's update `getLists` in backend first?
                // Or I can just fetch the lists, and the user adds to a list. 
                // The UI should show if it's already there. 
                // I will add a backend helper for this or just fetch all lists fully if user has small number of lists (max 20).
                // Let's modify `getLists` to include movie IDs only?
                
                // Workaround: Loop through the results here. 
                // Backend `getLists` call `select('-movies')`. 
                // I need another endpoint or modify existing.
                
                // Let's stick with: User adds to list. If it exists, backend errors (which is handled), 
                // status becomes "Added". 
                // However, to show state "Checked" is nicer.
                // I'll make a specialized call for this modal: /api/lists?checkMovie=ID
                
                // Let's quickly patch backend to support this check.
                 const res2 = await customFetch(`/api/lists?checkMovie=${movieId}`);
                 const data2 = await res2.json();
                 if (data2.success) setLists(data2.lists);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        setCreating(true);
        try {
            const res = await customFetch('/api/lists', {
                method: 'POST',
                body: JSON.stringify({ name: newListName })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã tạo danh sách');
                setNewListName('');
                fetchLists(); // Refresh
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error('Lỗi tạo danh sách');
        } finally {
            setCreating(false);
        }
    };

    const handleToggleMovie = async (list: MovieList) => {
        // Optimistic update
        const isAdding = !list.hasMovie;
        setLists(prev => prev.map(l => l._id === list._id ? { ...l, hasMovie: isAdding } : l));

        try {
            const method = isAdding ? 'POST' : 'DELETE';
            const url = isAdding 
                ? `/api/lists/${list._id}/movies` 
                : `/api/lists/${list._id}/movies/${movieId}`;
            
            const body = isAdding ? JSON.stringify({ movieId }) : undefined;

            const res = await customFetch(url, {
                method,
                body
            });
            const data = await res.json();
            
            if (!data.success) {
                // Revert
                setLists(prev => prev.map(l => l._id === list._id ? { ...l, hasMovie: !isAdding } : l));
                toast.error(data.message);
            }
        } catch {
            // Revert
            setLists(prev => prev.map(l => l._id === list._id ? { ...l, hasMovie: !isAdding } : l));
            toast.error('Lỗi cập nhật');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-surface-900 border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Lưu vào danh sách</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    {/* Create New */}
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Tạo danh sách mới..." 
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            className="bg-black/20 border-white/10 text-white"
                        />
                        <Button onClick={handleCreateList} disabled={creating || !newListName.trim()} className="bg-primary text-black">
                            {creating ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </Button>
                    </div>

                    {/* Lists */}
                    <div className="space-y-2 max-h-75 overflow-y-auto pr-2">
                        {loading ? (
                            <div className="flex justify-center py-4"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>
                        ) : lists.length === 0 ? (
                            <p className="text-gray-500 text-center py-4 text-sm">Chưa có danh sách nào</p>
                        ) : (
                            lists.map(list => (
                                <button
                                    key={list._id}
                                    onClick={() => handleToggleMovie(list)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group"
                                >
                                    <span className="font-medium text-gray-200 group-hover:text-white truncate">{list.name}</span>
                                    {list.hasMovie ? (
                                        <Check className="w-5 h-5 text-primary" />
                                    ) : (
                                        <Plus className="w-5 h-5 text-gray-600 group-hover:text-gray-400" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
