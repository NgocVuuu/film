'use client';
import { useEffect, useState } from 'react';
import { MovieCard } from '@/components/MovieCard';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HistoryPage() {
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('history') || '[]');
        setHistory(stored);
    }, []);

    const clearHistory = () => {
        if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) {
            setHistory([]);
            localStorage.setItem('history', JSON.stringify([]));
        }
    };

    return (
        <div className="min-h-screen bg-deep-black text-white pt-24 pb-10">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gold-gradient">Lịch Sử Xem</h1>
                    {history.length > 0 && (
                        <Button variant="outline" onClick={clearHistory} className="border-red-500/50 text-red-500 hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4 mr-2" /> Xóa Lịch Sử
                        </Button>
                    )}
                </div>

                {history.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Bạn chưa xem phim nào gần đây.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {history.map((movie) => (
                            <MovieCard key={movie.slug} movie={movie} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
