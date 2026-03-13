import Link from 'next/link';
import { Play } from 'lucide-react';
import { useLongPress } from '@/hooks/useLongPress';
import { useQuickView } from '@/contexts/QuickViewContext';

interface MovieCardProps {
    movie: {
        _id: string;
        name: string;
        origin_name: string;
        slug: string;
        thumb_url: string;
        year: number;
        episode_current?: string;
        quality?: string;
        lang?: string;
        progress?: {
            currentTime: number;
            duration: number;
            percentage: number;
            episodeSlug: string;
            episodeName: string;
        };
    };
    isEditing?: boolean;
}

export function MovieCard({ movie, isEditing }: MovieCardProps) {
    const { showQuickView } = useQuickView();
    const longPressHandlers = useLongPress(() => {
        showQuickView(movie as any);
    }, { delay: 800, shouldPreventDefault: false });

    // Helper to get unified language + episode badge style
    const getBadges = (quality?: string, episode?: string, lang?: string) => {
        const q = quality?.toLowerCase() || '';
        const l = lang?.toLowerCase() || '';
        // Remove 'Tập' and 'Hoàn tất' from episode string
        const epClean = episode?.replace(/Tập\s*/i, '').replace(/\s*Hoàn\s*tất/i, '').trim() || '';
        
        const checkString = (l + ' ' + q);
        const badges: { display: string; classes: string }[] = [];

        // Check for Vietsub
        if (checkString.includes('vietsub')) {
            badges.push({
                display: epClean ? `VS ${epClean}` : 'VS',
                classes: 'bg-yellow-500 text-black border-yellow-400/50'
            });
        }

        // Check for Thuyết Minh
        if (checkString.includes('thuyết minh')) {
            badges.push({
                display: epClean ? `TM ${epClean}` : 'TM',
                classes: 'bg-orange-500 text-white border-orange-400/50'
            });
        }

        // Check for Lồng Tiếng
        if (checkString.includes('lồng tiếng')) {
            badges.push({
                display: epClean ? `LT ${epClean}` : 'LT',
                classes: 'bg-[#8B4513] text-white border-orange-900/50'
            });
        }

        // Fallback to VS if no classification found but we have language info
        if (badges.length === 0 && (l || q)) {
            badges.push({
                display: epClean ? `VS ${epClean}` : 'VS',
                classes: 'bg-yellow-500 text-black border-yellow-400/50'
            });
        }

        return badges;
    };

    const badges = getBadges(movie.quality, movie.episode_current, movie.lang);

    return (
        <Link
            href={`/movie/${movie.slug}`}
            {...longPressHandlers}
            className="group relative block w-full rounded-md overflow-hidden bg-card border border-border shadow-md transition-all duration-300 hover:scale-[1.03] hover:shadow-primary/20"
        >
            {/* Image Container */}
            <div className="aspect-2/3 w-full overflow-hidden relative">
                <img
                    src={movie.thumb_url || '/logo.png'}
                    alt={movie.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                    }}
                />
                
                {/* Subtle Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />

                {/* Progress Bar */}
                {movie.progress && movie.progress.percentage > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-700/50 z-20">
                        <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(movie.progress.percentage, 100)}%` }}
                        />
                    </div>
                )}

                {/* Unified Badges (Bottom Right) */}
                <div className="absolute bottom-1 right-1 z-20 pointer-events-none flex flex-col items-end gap-0.5 max-w-[90%]">
                    {badges.map((b, idx) => (
                        <div key={idx} className={`backdrop-blur-md text-[6.5px] font-bold px-1 py-0.5 rounded-[2px] border shadow-sm transition-colors ${b.classes}`}>
                            {b.display}
                        </div>
                    ))}
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <div className="w-10 h-10 rounded-full bg-primary/90 text-black flex items-center justify-center shadow-lg shadow-primary/50 transform group-hover:scale-110 transition-transform">
                        <Play fill="currentColor" className="ml-1 w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Content Below Image */}
            <div className="p-1.5 pt-1 bg-surface-900/40">
                <div className="truncate">
                    <h3 className="text-[10.5px] font-medium text-white group-hover:text-primary transition-colors leading-tight truncate">
                        {movie.name}
                    </h3>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[9px] text-gray-500 truncate max-w-[75%] font-normal italic opacity-80">
                        {movie.origin_name}
                    </p>
                    <span className="text-[9px] text-gray-400 font-normal shrink-0">
                        {movie.year}
                    </span>
                </div>
            </div>
        </Link>
    );
}
