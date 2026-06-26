'use client';
import { useState } from 'react';
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MovieGallery({ images }: { images: string[] }) {
    const [selectedImg, setSelectedImg] = useState<string | null>(null);

    if (!images || images.length === 0) return null;

    const getImgUrl = (path: string, size = 'w500') => {
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return `https://image.tmdb.org/t/p/${size}${path}`;
    };

    const handlePrev = () => {
        if (!selectedImg) return;
        const currentIndex = images.indexOf(selectedImg);
        const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
        setSelectedImg(images[prevIndex]);
    };

    const handleNext = () => {
        if (!selectedImg) return;
        const currentIndex = images.indexOf(selectedImg);
        const nextIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
        setSelectedImg(images[nextIndex]);
    };

    return (
        <div className="mt-8">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full"></span>
                Thư viện ảnh
            </h3>
            
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {images.map((img, idx) => {
                    // Phân biệt ảnh ngang (backdrop) và dọc (poster) dựa vào kích thước gốc TMDB
                    // Tuy nhiên ta không có metadata width/height, ta có thể dùng tỷ lệ CSS chung hoặc cho phép object-cover
                    return (
                        <div 
                            key={idx} 
                            onClick={() => setSelectedImg(img)}
                            className="snap-start shrink-0 relative rounded-xl overflow-hidden cursor-pointer group"
                            style={{ 
                                // Nếu là poster thì w300, backdrop thì w500, nhưng ta có thể fixed height để nó tự giãn width
                                height: '200px'
                            }}
                        >
                            <img 
                                src={getImgUrl(img, 'w500')} 
                                alt="Movie scene" 
                                className="h-full w-auto object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lightbox */}
            {selectedImg && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm">
                    <button 
                        onClick={() => setSelectedImg(null)}
                        className="absolute top-4 right-4 md:top-8 md:right-8 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white z-50"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    <button 
                        onClick={handlePrev}
                        className="absolute left-4 md:left-8 p-3 bg-black/50 hover:bg-primary hover:text-black rounded-full transition-all text-white z-50"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="w-full max-w-5xl max-h-[90vh] px-12 relative flex items-center justify-center">
                        <img 
                            src={getImgUrl(selectedImg, 'original')} 
                            alt="Movie scene full" 
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                    </div>

                    <button 
                        onClick={handleNext}
                        className="absolute right-4 md:right-8 p-3 bg-black/50 hover:bg-primary hover:text-black rounded-full transition-all text-white z-50"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
}
