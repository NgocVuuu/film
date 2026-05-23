import Link from 'next/link';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { encodeServerForUrl } from '@/lib/serverUrl';

interface ContinueWatchingCardProps {
    movie: {
        _id: string;
        name: string;
        origin_name: string;
        slug: string;
        thumb_url: string;
        year: number;
        episode_current?: string;
        progress: {
            currentTime: number;
            duration: number;
            percentage: number;
            episodeSlug: string;
            episodeName: string;
            serverName?: string;
        };
    };
    onRemove?: (slug: string, episodeSlug: string) => void;
}

export function ContinueWatchingCard({ movie, onRemove }: ContinueWatchingCardProps) {
    // Safety check
    if (!movie.progress) {
        console.error('[ContinueWatchingCard] Missing progress data:', movie);
        return null;
    }

    // Build watch URL with episode and timestamp - encode server to hide internal names
    const serverQuery = movie.progress.serverName ? `&server=${encodeServerForUrl(movie.progress.serverName)}` : '';
    const watchUrl = `/movie/${movie.slug}/watch?episode=${movie.progress.episodeSlug}&t=${Math.floor(movie.progress.currentTime)}${serverQuery}`;

    return (
        <Link
            href={watchUrl}
            className="group relative block w-full rounded-md overflow-hidden bg-card border border-border shadow-md hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
        >
            {/* Image Container */}
            <div className="aspect-[2/3] w-full overflow-hidden relative">
                <img
                    src={movie.thumb_url}
                    alt={movie.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-700/50 z-20">
                    <div
                        className="h-full bg-primary shadow-[0_0_10px_rgba(234,179,8,0.7)]"
                        style={{ width: `${Math.min(movie.progress.percentage, 100)}%` }}
                    />
                </div>

                {/* Episode Badge with Progress */}
                <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-20 max-w-[75%]">
                    <div className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded border border-white/10 truncate w-full">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {movie.progress.episodeName}
                    </div>
                    <div className="bg-primary/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                        {movie.progress.percentage}%
                    </div>
                </div>

                {/* Remove Button */}
                {onRemove && (
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1.5 right-1.5 z-30 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow-md transition-all active:scale-90"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onRemove(movie.slug, movie.progress.episodeSlug);
                        }}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black via-black/80 to-transparent pt-6">
                <div className="truncate marquee-container">
                    <h3 className="text-xs font-semibold text-white group-hover:text-primary transition-colors leading-tight hover-marquee">
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
