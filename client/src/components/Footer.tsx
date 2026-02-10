import Link from 'next/link';
import { Film } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full border-t border-white/10 bg-deep-black py-8 mt-auto">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Branding */}
                <div className="flex flex-col items-center md:items-start gap-2">
                    <Link href="/" className="flex items-center gap-2">
                        <img
                            src="/logo.png"
                            alt="Pchill Logo"
                            className="h-12 w-auto object-contain rounded-md"
                        />
                        <span className="text-xl font-bold tracking-tighter text-gold-gradient">
                            PCHILL
                        </span>
                    </Link>
                    <p className="text-xs text-gray-500">
                        Trải nghiệm điện ảnh đỉnh cao tại nhà.
                    </p>
                </div>

                {/* Links */}
                <div className="flex gap-6 text-sm text-gray-400">
                    <Link href="/terms" className="hover:text-primary transition-colors">Điều khoản</Link>
                    <Link href="/privacy" className="hover:text-primary transition-colors">Chính sách</Link>
                    <Link href="/contact" className="hover:text-primary transition-colors">Liên hệ</Link>
                    <Link href="/dmca" className="hover:text-primary transition-colors">DMCA</Link>
                </div>

                {/* Copyright */}
                <div className="text-xs text-gray-600">
                    © 2024 Pchill. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
