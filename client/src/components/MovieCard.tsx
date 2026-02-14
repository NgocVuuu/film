import Link from 'next/link';
import { Play } from 'lucide-react';

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
    return (
        <Link
            href={`/movie/${movie.slug}`}
            className="group relative block w-full rounded-md overflow-hidden bg-card border border-border shadow-md hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
        >
            {/* Image Container */}
            <div className="aspect-2/3 w-full overflow-hidden relative">
                <img
                    src={movie.thumb_url || '/logo.png'}
                    alt={movie.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                    }}
                />
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                {/* Progress Bar */}
                {movie.progress && movie.progress.percentage > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-700/50 z-20">
                        <div
                            className="h-full bg-primary shadow-[0_0_10px_rgba(234,179,8,0.7)]"
                            style={{ width: `${Math.min(movie.progress.percentage, 100)}%` }}
                        />
                    </div>
                )}

                {/* Episode Badge if Watching */}
                {movie.progress && (
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded border border-white/10 z-20">
                        Đang xem: {movie.progress.episodeName}
                    </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <div className="w-12 h-12 rounded-full bg-primary/90 text-black flex items-center justify-center shadow-lg shadow-primary/50 transform group-hover:scale-110 transition-transform">
                        <Play fill="currentColor" className="ml-1 w-6 h-6" />
                    </div>
                </div>

                {/* Episode/Quality Badge */}
                <div className={`absolute ${isEditing ? 'top-10' : 'top-2'} right-2 bg-primary text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow z-20 transition-all`}>
                    {movie.episode_current || movie.quality || 'HD'}
                </div>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 w-full p-3 bg-linear-to-t from-black via-black/80 to-transparent pt-6">
                <div className="truncate marquee-container">
                    <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors uppercase leading-tight hover-marquee">
                        {movie.name}
                    </h3>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400 truncate max-w-[70%]">{movie.origin_name}</p>
                    <span className="text-xs text-primary font-medium border border-primary/30 px-1 rounded bg-black/50">
                        {movie.year}
                    </span>
                </div>
            </div>
        </Link>
    );
}
