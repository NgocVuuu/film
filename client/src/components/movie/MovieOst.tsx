'use client';

export function MovieOst({ ostId, source }: { ostId?: string; source?: string }) {
    if (!ostId || !source) return null;

    return (
        <div className="mt-8">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full"></span>
                Nhạc Phim (OST)
            </h3>
            
            <div className="w-full bg-surface-900 rounded-2xl overflow-hidden shadow-lg border border-white/5">
                {source === 'spotify' ? (
                    <iframe 
                        src={`https://open.spotify.com/embed/${ostId}`} 
                        width="100%" 
                        height="352" 
                        frameBorder="0" 
                        allowFullScreen 
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                        loading="lazy"
                        className="bg-transparent"
                    />
                ) : (
                    <div className="aspect-video">
                        <iframe 
                            src={`https://www.youtube.com/embed/videoseries?list=${ostId}`} 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            allowFullScreen 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            loading="lazy"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
