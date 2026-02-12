'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, CheckCircle } from 'lucide-react';

import { toast } from 'react-hot-toast';

export default function FeedbackPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'feature' as 'bug' | 'feature' | 'content' | 'other',
        email: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Ideally call API to save feedback
            // For now simulate success or send to admin email endpoint if available
            // Assuming we have or will create an endpoint, or just simulate for MVP
             await new Promise(resolve => setTimeout(resolve, 1000));
            // const res = await customFetch('/api/feedback', {
            //     method: 'POST',
            //     body: JSON.stringify(formData)
            // });
            
            toast.success('Cảm ơn bạn đã đóng góp ý kiến!');
            setSuccess(true);
            setFormData({ title: '', content: '', type: 'feature', email: '' });
        } catch (error) {
            toast.error('Có lỗi xảy ra, vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen pt-24 pb-20 px-4 flex items-center justify-center">
                <div className="max-w-md w-full bg-surface-900 border border-white/10 rounded-xl p-8 text-center animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Đã gửi thành công!</h2>
                    <p className="text-gray-400 mb-6">
                        Cảm ơn bạn đã đóng góp ý kiến để giúp PChill ngày càng hoàn thiện hơn.
                    </p>
                    <Button onClick={() => setSuccess(false)} variant="outline">
                        Gửi ý kiến khác
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-20 px-4">
            <div className="container mx-auto max-w-2xl">
                <div className="mb-8 text-center animate-in slide-in-from-bottom-4 duration-500">
                    <h1 className="text-3xl font-bold text-white mb-2">Góp ý & Báo lỗi</h1>
                    <p className="text-gray-400">
                        Ý kiến đóng góp của bạn rất quan trọng với chúng tôi
                    </p>
                </div>

                <div className="bg-surface-900 border border-white/10 rounded-xl p-6 md:p-8 shadow-xl animate-in fade-in duration-500 delay-150">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Loại góp ý</label>
                                <select 
                                    className="w-full bg-black/50 border border-white/10 rounded-lg h-10 px-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                                >
                                    <option value="feature">Đề xuất tính năng</option>
                                    <option value="content">Yêu cầu phim / Nội dung</option>
                                    <option value="bug">Báo lỗi hệ thống</option>
                                    <option value="other">Khác</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Email (Tùy chọn)</label>
                                <Input 
                                    placeholder="example@gmail.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="bg-black/50 border-white/10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Tiêu đề <span className="text-red-500">*</span></label>
                            <Input 
                                placeholder="Tóm tắt ý kiến của bạn"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="bg-black/50 border-white/10"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Nội dung chi tiết <span className="text-red-500">*</span></label>
                            <Textarea 
                                placeholder="Mô tả chi tiết vấn đề hoặc đề xuất của bạn..."
                                required
                                rows={5}
                                value={formData.content}
                                onChange={(e) => setFormData({...formData, content: e.target.value})}
                                className="bg-black/50 border-white/10 resize-none"
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            Gửi góp ý
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}