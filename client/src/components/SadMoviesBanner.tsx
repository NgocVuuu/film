import Link from 'next/link';

export function SadMoviesBanner({ compact }: { compact?: boolean }) {
    return (
        <Link href="/sad-movies" className="block group">
            <div
                className="relative w-full overflow-hidden rounded-2xl cursor-pointer select-none flex items-center"
                style={{
                    background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1220 35%, #1a1030 60%, #2a1a4a 100%)',
                    minHeight: compact ? 80 : 140,
                }}
            >
                {/* Decorative elements */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* Soft blue glow left */}
                    <div className="absolute -left-8 -top-8 w-48 h-48 rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                        style={{ background: 'radial-gradient(circle, #6b7fff, transparent)' }} />

                    {/* Pink glow right */}
                    <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full opacity-15 group-hover:opacity-25 transition-opacity duration-500"
                        style={{ background: 'radial-gradient(circle, #ff6b9d, transparent)' }} />

                    {/* Rain drops */}
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i}
                            className="absolute w-px rounded-full opacity-25"
                            style={{
                                background: 'linear-gradient(to bottom, transparent, #a0b4ff)',
                                left: `${20 + i * 14}%`,
                                top: 0,
                                height: `${40 + (i % 3) * 20}px`,
                            }}
                        />
                    ))}

                    {/* Bottom glow line */}
                    <div className="absolute bottom-0 left-0 right-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, #818cfb66, transparent)' }} />
                </div>

                {/* Content */}
                <div className={`relative z-10 flex items-center gap-3 lg:gap-4 px-4 lg:px-6 w-full ${compact ? '' : 'py-6'}`}>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <h2 className={`text-white font-bold leading-tight group-hover:text-indigo-300 transition-colors ${compact ? 'text-xs lg:text-sm' : 'text-sm lg:text-xl'}`}>
                            Chữa Rách Vết Thương Lành
                        </h2>
                        {!compact && (
                            <p className="text-blue-200/60 text-xs md:text-sm mt-0.5 line-clamp-2">
                                Muốn khóc mà không thể? Để những bộ phim này làm điều đó thay bạn.
                            </p>
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="shrink-0 flex items-center gap-2 text-indigo-400 group-hover:text-indigo-300 transition-colors text-sm font-medium">
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
