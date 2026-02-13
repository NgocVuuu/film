import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="w-full border-t border-white/10 bg-deep-black py-4 mt-auto">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Branding */}
                <div className="flex flex-col items-center md:items-start gap-1">
                    <Link href="/" className="flex items-center gap-2">
                        <img
                            src="/logo.png"
                            alt="Pchill Logo"
                            className="h-8 w-auto object-contain rounded-md"
                        />
                        <span className="text-lg font-bold tracking-tighter text-gold-gradient">
                            PCHILL
                        </span>
                    </Link>
                    <p className="text-[10px] text-gray-500">
                        Trải nghiệm điện ảnh đỉnh cao tại nhà.
                    </p>
                </div>

                {/* Links */}
                <div className="hidden md:flex gap-4 text-xs text-gray-400">
                    <Link href="/terms" className="hover:text-primary transition-colors">Điều khoản</Link>
                    <Link href="/privacy" className="hover:text-primary transition-colors">Chính sách</Link>
                    <Link href="/feedback" className="hover:text-primary transition-colors">Góp ý</Link>
                    <Link href="/dmca" className="hover:text-primary transition-colors">DMCA</Link>
                </div>

                {/* Copyright */}
                <div className="text-[10px] text-gray-600">
                    © 2024 Pchill. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
