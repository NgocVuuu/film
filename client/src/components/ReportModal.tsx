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
import { Flag, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_URL } from '@/lib/config';

interface ReportModalProps {
    movieSlug: string;
    movieName: string;
    episodeSlug?: string;
    episodeName?: string;
}

export function ReportModal({ movieSlug, movieName, episodeSlug, episodeName }: ReportModalProps) {
    const [open, setOpen] = useState(false);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [issueType, setIssueType] = useState('error-loading');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    movieSlug,
                    movieName,
                    episodeSlug,
                    episodeName,
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
        } catch (error) {
            toast.error('Lỗi kết nối.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/10">
                    <Flag className="w-4 h-4" /> Báo lỗi
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-surface-900 border-white/10 text-white">
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
                            <SelectTrigger className="bg-surface-800 border-white/10">
                                <SelectValue placeholder="Chọn loại lỗi" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface-800 border-white/10 text-white">
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
                            className="bg-surface-800 border-white/10 h-24"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-yellow-500 text-black hover:bg-yellow-600">
                            {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
