'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { X, Send, Film } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { getAuthToken } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface ShareMomentModalProps {
    movieSlug: string;
    episodeName?: string;
    timestamp: number;
    onClose: () => void;
    onSuccess: () => void;
}

const formatTime = (seconds: number) => {
    if (!seconds) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function ShareMomentModal({
    movieSlug,
    episodeName,
    timestamp,
    onClose,
    onSuccess
}: ShareMomentModalProps) {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error('Vui lòng đăng nhập để chia sẻ khoảnh khắc');
            return;
        }

        if (!content.trim()) {
            toast.error('Vui lòng nhập cảm nghĩ của bạn');
            return;
        }

        setSubmitting(true);
        try {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    movieSlug,
                    content,
                    episodeName,
                    timestamp
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã chia sẻ khoảnh khắc thành công!');
                onSuccess();
                onClose();
            } else {
                toast.error(data.message || 'Lỗi khi chia sẻ khoảnh khắc');
            }
        } catch {
            toast.error('Lỗi kết nối');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-surface-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surface-800/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Film className="w-5 h-5 text-primary" />
                        Chia sẻ khoảnh khắc
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="bg-primary/20 text-primary px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 border border-primary/30">
                            🕒 {formatTime(timestamp)}
                        </div>
                        {episodeName && (
                            <div className="bg-white/5 text-gray-400 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10">
                                {episodeName}
                            </div>
                        )}
                    </div>
                    
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Bạn cảm thấy thế nào về khoảnh khắc này?"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none min-h-[100px] resize-none"
                        autoFocus
                    />
                    
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-gray-400 hover:text-white hover:bg-white/5"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting || !content.trim()}
                            className="bg-primary hover:bg-primary/90 text-black font-bold gap-2"
                        >
                            {submitting ? 'Đang gửi...' : (
                                <>
                                    <Send className="w-4 h-4" /> Gửi
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
