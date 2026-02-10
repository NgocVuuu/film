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
        poster_url?: string;
    };
}

export function MovieCard({ movie }: MovieCardProps) {
    return (
        <Link
            href={`/movie/${movie.slug}`}
            className="group relative block w-full rounded-md overflow-hidden bg-card border border-border shadow-md hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
        >
            {/* Image Container */}
            <div className="aspect-[2/3] w-full overflow-hidden relative">
                <img
                    src={movie.thumb_url}
                    alt={movie.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <div className="w-12 h-12 rounded-full bg-primary/90 text-black flex items-center justify-center shadow-lg shadow-primary/50 transform group-hover:scale-110 transition-transform">
                        <Play fill="currentColor" className="ml-1 w-6 h-6" />
                    </div>
                </div>

                {/* Live/Quality Badge (Optional) */}
                <div className="absolute top-2 right-2 bg-primary text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                    HD
                </div>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black via-black/80 to-transparent pt-6">
                <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors uppercase leading-tight">
                    {movie.name}
                </h3>
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
