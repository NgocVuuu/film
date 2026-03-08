import Link from 'next/link';

export function KoreanDrama2016Banner({ compact }: { compact?: boolean }) {
    return (
        <Link href="/phim-han-2016" className="block group">
            <div
                className="relative w-full overflow-hidden rounded-2xl cursor-pointer select-none flex items-center"
                style={{
                    background: 'linear-gradient(135deg, #0d0a1a 0%, #1a0a2e 30%, #2d1b4e 60%, #9b4dca 100%)',
                    minHeight: compact ? 80 : 140,
                }}
            >
                {/* Decorative blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* Cherry blossom blob left */}
                    <svg className="absolute -left-10 -top-10 w-64 h-64 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                        viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#e879f9"
                            d="M42.7,-73.4C55.6,-67.2,66.5,-56.5,74,-43.5C81.5,-30.5,85.6,-15.3,85.4,-0.1C85.2,15,80.7,30,72.7,42.7C64.7,55.4,53.2,65.8,40,72.8C26.8,79.8,11.9,83.4,-2.8,87.4C-17.5,91.4,-35,95.8,-48.4,89.6C-61.8,83.4,-71.1,66.6,-77.2,49.5C-83.3,32.4,-86.2,15,-84.9,-1.8C-83.6,-18.6,-78.1,-34.8,-68.5,-47.5C-58.9,-60.2,-45.2,-69.4,-31,-75.1C-16.8,-80.8,0,-83,13.8,-80.3C27.6,-77.6,29.8,-79.6,42.7,-73.4Z"
                            transform="translate(100 100)" />
                    </svg>

                    {/* Heart-ish shape right */}
                    <svg className="absolute right-6 top-1/2 -translate-y-1/2 w-24 h-28 opacity-20 group-hover:opacity-35 transition-opacity duration-500 -rotate-6"
                        viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#c084fc"
                            d="M50 110 C20 85, 0 65, 0 40 C0 18, 18 0, 40 0 C46 0, 52 2, 57 5 C62 2, 68 0, 74 0 C96 0, 100 22, 95 40 C88 65, 70 85, 50 110 Z" />
                    </svg>

                    {/* Glow dots */}
                    <div className="absolute right-36 top-3 w-12 h-12 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #e879f9, transparent)' }} />
                    <div className="absolute left-1/3 bottom-3 w-8 h-8 rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />

                    {/* Bottom glow line */}
                    <div className="absolute bottom-0 left-0 right-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, #c084fc, transparent)' }} />
                </div>

                {/* Content */}
                <div className={`relative z-10 flex items-center gap-3 lg:gap-4 px-4 lg:px-6 w-full ${compact ? '' : 'py-6'}`}>
                    {/* Badge */}
                    <div className="shrink-0">
                        <div
                            className={`flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 px-2 lg:px-3 rounded-lg shadow-lg shadow-purple-900/50 ${compact ? 'py-0.5' : 'py-1.5'}`}
                        >
                            <span className={`text-white font-black tracking-widest leading-none opacity-80 ${compact ? 'text-[8px]' : 'text-[10px] lg:text-xs'}`}>K-DRAMA</span>
                            <span className={`text-white font-black leading-none ${compact ? 'text-base' : 'text-xl lg:text-3xl'}`} style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>2016</span>
                        </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <h2 className={`text-white font-bold leading-tight group-hover:text-purple-300 transition-colors ${compact ? 'text-xs lg:text-sm' : 'text-sm lg:text-xl'}`}>
                            Hoàng Kim K-Drama 2016
                        </h2>
                        {!compact && (
                            <p className="text-purple-200/70 text-xs md:text-sm mt-0.5 line-clamp-2">
                                Năm 2016 — một năm không thể quên của những trái tim yêu phim Hàn. Yêu tinh, Hậu Duệ, Mây Họa Ánh Trăng... mỗi bộ phim là một ký ức đẹp.
                            </p>
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="shrink-0 flex items-center gap-2 text-purple-400 group-hover:text-purple-300 transition-colors text-sm font-medium">
                        <span className="hidden lg:block text-xs md:text-sm">Xem tất cả</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}
