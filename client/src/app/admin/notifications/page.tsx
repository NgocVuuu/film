'use client';
import { useState } from 'react';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Users, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminNotificationsPage() {
    const [content, setContent] = useState('');
    const [link, setLink] = useState('/');
    const [sending, setSending] = useState(false);
    const [targetUserId, setTargetUserId] = useState('');
    const [targetType, setTargetType] = useState<'all' | 'specific'>('all');

    const handleSend = async () => {
        if (!content.trim()) {
            toast.error('Vui lòng nhập nội dung thông báo');
            return;
        }

        if (targetType === 'specific' && !targetUserId.trim()) {
            toast.error('Vui lòng nhập User ID');
            return;
        }

        try {
            setSending(true);
            const endpoint = targetType === 'all'
                ? '/api/admin/notifications/broadcast'
                : `/api/admin/notifications/user/${targetUserId}`;

            const res = await customFetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    content,
                    link,
                    type: 'system'
                })
            });
            const data = await res.json();

            if (data.success) {
                toast.success(data.message);
                setContent('');
                setLink('/');
                setTargetUserId('');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Send notification error:', error);
            toast.error('Lỗi khi gửi thông báo');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6">Gửi Thông báo</h1>

            <div className="bg-surface-900 rounded-lg p-6 max-w-2xl">
                <div className="space-y-6">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Đối tượng nhận</label>
                        <div className="flex gap-4">
                            <Button
                                variant={targetType === 'all' ? 'default' : 'outline'}
                                onClick={() => setTargetType('all')}
                                className="flex-1"
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Tất cả người dùng
                            </Button>
                            <Button
                                variant={targetType === 'specific' ? 'default' : 'outline'}
                                onClick={() => setTargetType('specific')}
                                className="flex-1"
                            >
                                <User className="w-4 h-4 mr-2" />
                                User cụ thể
                            </Button>
                        </div>
                    </div>

                    {targetType === 'specific' && (
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">User ID</label>
                            <Input
                                value={targetUserId}
                                onChange={(e) => setTargetUserId(e.target.value)}
                                placeholder="Nhập User ID"
                                className="bg-surface-800 border-white/10 text-white"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Nội dung thông báo</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Nhập nội dung..."
                            rows={4}
                            className="w-full bg-surface-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Link (tùy chọn)</label>
                        <Input
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="/"
                            className="bg-surface-800 border-white/10 text-white"
                        />
                    </div>

                    <Button
                        onClick={handleSend}
                        disabled={sending}
                        className="w-full bg-primary hover:bg-primary/90 text-black font-bold"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Đang gửi...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Gửi thông báo
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
