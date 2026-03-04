'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';

interface RequestMovieModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMovieName?: string;
}

export function RequestMovieModal({ isOpen, onClose, initialMovieName = '' }: RequestMovieModalProps) {
    const [movieName, setMovieName] = useState(initialMovieName);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialMovieName) {
            setMovieName(initialMovieName);
        }
    }, [isOpen, initialMovieName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!movieName.trim()) {
            toast.error('Vui lòng nhập tên phim');
            return;
        }

        try {
            setLoading(true);

            const response = await customFetch(`/api/search/request`, {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    movieName: movieName.trim(),
                    is4kRequest: true
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || 'Yêu cầu đã được ghi nhận!');
                setMovieName('');
                onClose();
            } else {
                toast.error(data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Request movie error:', error);
            toast.error('Lỗi khi gửi yêu cầu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-white/10 text-white shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-yellow-500">
                        <Crown className="w-5 h-5" />
                        Yêu cầu phim 4K
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Nhập tên phim để Ad tìm giúp bạn nhé.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Tên bộ phim <span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="VD: Avengers Endgame, Mai..."
                            value={movieName}
                            onChange={(e) => setMovieName(e.target.value)}
                            className="bg-black/20 border-white/10 text-white focus:border-yellow-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <Button type="button" variant="outline" onClick={onClose} className="border-white/10 text-white hover:bg-white/10" disabled={loading}>
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !movieName.trim()}
                            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold border-none"
                        >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
                            Gửi yêu cầu ngay
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
