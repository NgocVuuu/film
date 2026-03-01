'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { customFetch } from '@/lib/api';

interface ReportModalProps {
    movieSlug: string;
    movieName: string;
    episodeSlug?: string;
    episodeName?: string;
    serverName?: string;
}

export function ReportModal({ movieSlug, movieName, episodeSlug, episodeName, serverName }: ReportModalProps) {
    const [open, setOpen] = useState(false);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [issueType, setIssueType] = useState('error-loading');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await customFetch(`/api/reports`, {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    movieSlug,
                    movieName,
                    episodeSlug,
                    episodeName,
                    serverName,
                    content: `[${issueType}] ${content}`
                })
            });

            const data = await res.json();

            if (data.success) {
                toast.success('Gửi báo lỗi thành công! Cảm ơn bạn.');
                setOpen(false);
                setContent('');
                setIssueType('error-loading');
            } else {
                toast.error(data.message || 'Có lỗi xảy ra.');
            }
        } catch {
            toast.error('Lỗi kết nối.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-red-400 gap-1">
                    <AlertTriangle className="w-4 h-4" /> Báo lỗi
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-w-[95vw] bg-[#111111] border border-white/20 text-white shadow-2xl rounded-xl p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-yellow-500">
                        <AlertTriangle className="w-5 h-5" /> Báo lỗi phim
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Hãy cho chúng tôi biết vấn đề bạn đang gặp phải với tập phim này.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Loại lỗi</Label>
                        <Select value={issueType} onValueChange={setIssueType}>
                            <SelectTrigger className="bg-black/60 border border-white/20 text-white focus:ring-1 focus:ring-yellow-500">
                                <SelectValue placeholder="Chọn loại lỗi" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-white/20 text-white shadow-xl">
                                <SelectItem value="error-loading">Không tải được phim</SelectItem>
                                <SelectItem value="no-sub">Thiếu Vietsub/Thuyết minh</SelectItem>
                                <SelectItem value="wrong-ep">Sai tập phim</SelectItem>
                                <SelectItem value="audio-sync">Lệch tiếng/hình</SelectItem>
                                <SelectItem value="other">Khác</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Chi tiết</Label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Mô tả thêm về lỗi..."
                            className="bg-black/60 border border-white/20 text-white focus:ring-1 focus:ring-yellow-500 h-24 resize-none"
                            required
                        />
                    </div>
                    <DialogFooter className="mt-2">
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                            {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
