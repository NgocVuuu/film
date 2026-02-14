'use client';
import StaticPage from '@/components/StaticPage';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
    return (
        <StaticPage
            title="Liên hệ"
            content={
                <div className="space-y-8">
                    <p>Mọi thắc mắc, góp ý hoặc báo lỗi, vui lòng liên hệ với chúng tôi qua các kênh sau:</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/5 p-6 rounded-lg border border-white/10 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
                            <Mail className="w-10 h-10 text-primary mb-4" />
                            <h3 className="font-bold text-white mb-2">Email</h3>
                            <p className="text-sm">support@pchill.online</p>
                            <p className="text-sm">ads@pchill.online</p>
                        </div>

                        <div className="bg-white/5 p-6 rounded-lg border border-white/10 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
                            <Phone className="w-10 h-10 text-primary mb-4" />
                            <h3 className="font-bold text-white mb-2">Điện thoại</h3>
                            <p className="text-sm">+84 999 999 999</p>
                            <p className="text-xs text-gray-500">(Giờ hành chính)</p>
                        </div>

                        <div className="bg-white/5 p-6 rounded-lg border border-white/10 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
                            <MapPin className="w-10 h-10 text-primary mb-4" />
                            <h3 className="font-bold text-white mb-2">Địa chỉ</h3>
                            <p className="text-sm">Hà Nội, Việt Nam</p>
                        </div>
                    </div>
                </div>
            }
        />
    );
}
