import Link from 'next/link';

export function StephenChowBanner() {
    return (
        <Link href="/chau-tinh-tri" className="block group">
            <div className="relative w-full overflow-hidden rounded-2xl cursor-pointer select-none"
                style={{
                    background: 'linear-gradient(135deg, #2c1a01 0%, #593101 40%, #c47600 70%, #ffaa00 100%)',
                    minHeight: 140,
                }}>

                {/* Blob shapes */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* Large blob left */}
                    <svg className="absolute -left-16 -top-16 w-72 h-72 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                        viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#ffd000"
                            d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.5,90,-16.3,88.5,-0.9C87,14.6,81.4,29.2,73.1,42.2C64.8,55.2,53.8,66.6,40.6,74.4C27.4,82.2,13.7,86.4,-1.1,88.1C-15.9,89.8,-31.8,89,-45.3,82.1C-58.8,75.2,-69.9,62.2,-77.4,47.4C-84.9,32.6,-88.8,16.3,-87.6,0.7C-86.4,-14.9,-80.1,-29.8,-71.3,-42.7C-62.5,-55.6,-51.2,-66.5,-38,-74.1C-24.8,-81.7,-9.6,-86.1,3.6,-91.8C16.8,-97.5,30.6,-83.6,44.7,-76.4Z"
                            transform="translate(100 100)" />
                    </svg>
                    {/* The leaf/teardrop shape */}
                    <svg className="absolute right-8 top-1/2 -translate-y-1/2 w-28 h-36 opacity-25 group-hover:opacity-40 transition-opacity duration-500 rotate-12"
                        viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#ffb703"
                            d="M50 0 C80 20, 100 55, 80 90 C65 115, 35 115, 20 90 C0 55, 20 20, 50 0 Z" />
                    </svg>
                    {/* Small blob right */}
                    <div className="absolute right-40 top-4 w-16 h-16 rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, #ffe169, transparent)' }} />
                    {/* Glowing line */}
                    <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #fb8500, transparent)' }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex items-center gap-6 px-6 md:px-10 py-6">
                    {/* Text block logo for Stephen Chow */}
                    <div className="shrink-0 flex items-center justify-center">
                        <div className="bg-[#fb8500] border-2 border-white/30 px-4 py-2 rounded font-black text-white tracking-widest text-lg md:text-2xl shadow-lg shadow-orange-900/50 flex flex-col items-center justify-center -rotate-3 hover:rotate-0 transition-transform"
                            style={{ fontFamily: '"Arial Black", sans-serif' }}>
                            <span>STEPHEN</span>
                            <span className="text-yellow-200">CHOW</span>
                        </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-white font-bold text-base md:text-xl leading-tight group-hover:text-amber-200 transition-colors">
                            Hài Châu Tinh Trì
                        </h2>
                        <p className="text-gray-300 text-xs md:text-sm mt-0.5 max-h-5 overflow-hidden text-ellipsis whitespace-nowrap">
                            Tuyển tập 48+ siêu phẩm Vua Hài Kịch
                        </p>
                    </div>

                    {/* Arrow */}
                    <div className="shrink-0 flex items-center gap-2 text-amber-400 group-hover:text-amber-300 transition-colors text-sm font-medium">
                        <span className="hidden sm:block">Xem tất cả</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}
