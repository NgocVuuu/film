'use client';
import { useEffect, useState } from 'react';
import { MovieCard } from '@/components/MovieCard';
import LoadingScreen from '@/components/LoadingScreen';
import { API_URL } from '@/lib/config';

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    poster_url?: string;
    year: number;
    episode_current?: string;
    quality?: string;
    _vi?: string;
}

const DRAMAS = [
    {
        vi: 'Reply 1988',
        enKey: 'Reply 1988',
        month: '10/2015',
        desc: 'Lời từ biệt ngọt ngào nhất cho thanh xuân, cho tình hàng xóm và những lần bỏ lỡ đầy nuối tiếc ở ngõ nhỏ Ssangmun-dong.',
    },
    {
        vi: 'Hậu Duệ Mặt Trời',
        enKey: 'Descendants of the Sun',
        month: '2/2016',
        desc: 'Bản hùng ca về tình yêu và lý tưởng. Cái hất tay điện thoại kinh điển và những lời thề dưới nắng vàng Hy Lạp.',
    },
    {
        vi: 'Lại Là Oh Hae Young',
        enKey: 'Another Oh Hae-young',
        month: '5/2016',
        desc: 'Sự đồng cảm sâu sắc cho những "người bình thường", những tâm hồn chịu nhiều tổn thương nhưng vẫn khao khát được yêu hết mình.',
    },
    {
        vi: 'Chuyện Tình Bác Sĩ',
        enKey: 'Doctors',
        month: '6/2016',
        desc: 'Khi những vết sẹo quá khứ được chữa lành bằng sự trưởng thành và một tình yêu kiên nhẫn.',
    },
    {
        vi: 'Yêu Không Kiểm Soát',
        enKey: 'One More Happy Ending',
        month: '7/2016',
        desc: 'Một nốt trầm đau đớn. Tuyết rơi, cái tựa vai định mệnh và sự ra đi khiến người xem day dứt mãi khôn nguôi.',
    },
    {
        vi: 'Mây Họa Ánh Trăng',
        enKey: 'Moonlight Drawn by Clouds',
        month: '8/2016',
        desc: 'Trong trẻo và dịu dàng như một bài thơ mùa thu về tình yêu đầu đời của Thế tử và nàng thái giám.',
    },
    {
        vi: 'Người Tình Ánh Trăng',
        enKey: 'Moon Lovers',
        month: '8/2016',
        desc: 'Nỗi đau thấu tận tâm can. Goryeo năm ấy tuyết rơi đầy, nhưng người ở lại thì cô độc, người ra đi thì mang theo cả một trái tim vụn vỡ.',
    },
    {
        vi: 'Mật Danh K2',
        enKey: 'The K2',
        month: '9/2016',
        desc: 'Những cuộc rượt đuổi nghẹt thở và tình yêu nảy mầm giữa ranh giới sống còn của chàng vệ sĩ.',
    },
    {
        vi: 'Người Thầy Y Đức',
        enKey: 'Romantic Doctor',
        month: '11/2016',
        desc: 'Nơi y đạo không chỉ là cứu người, mà là giữ vững niềm tin và nhân cách giữa cuộc đời bão tố.',
    },
    {
        vi: 'Huyền Thoại Biển Xanh',
        enKey: 'Legend of the Blue Sea',
        month: '11/2016',
        desc: 'Mối duyên nợ nghìn năm giữa đại dương và mặt đất, đẹp lung linh như một câu chuyện cổ tích hiện đại.',
    },
    {
        vi: 'Cô Nàng Cử Tạ Kim Bok Joo',
        enKey: 'Weightlifting Fairy',
        month: '11/2016',
        desc: 'Hương vị của tình yêu gà bông, của những nỗ lực tuổi trẻ và câu hỏi cửa miệng: "Cậu có thích Messi không?"',
    },
    {
        vi: 'Yêu Tinh',
        enKey: 'Goblin',
        month: '12/2016',
        desc: 'Lời kết hoàn hảo cho năm 2016. Một kiệt tác về sự sống, cái chết và những linh hồn khao khát được thuộc về nhau mãi mãi.',
    },
];

// Match a movie from API results by checking the _vi field added by the backend
function matchMovie(drama: typeof DRAMAS[0], movies: Movie[]): Movie | null {
    return movies.find(m => m._vi === drama.vi) || null;
}

export default function KoreanDrama2016Page() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/movies/korean-drama-2016`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => { if (data.success) setMovies(data.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingScreen />;

    const notFound = DRAMAS.filter(d => !matchMovie(d, movies));

    return (
        <div className="min-h-screen bg-deep-black text-foreground pb-20">
            {/* Hero Banner */}
            <div className="relative w-full overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0d0a1a 0%, #1a0a2e 30%, #2d1b4e 60%, #6b21a8 100%)', minHeight: 260 }}>
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-60px] left-[-60px] w-80 h-80 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #e879f9, transparent)' }} />
                    <div className="absolute bottom-[-40px] right-[-40px] w-60 h-60 rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
                </div>
                <div className="relative container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
                    <div className="inline-flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 px-8 py-3 mb-4 rounded-xl shadow-lg shadow-purple-900/60">
                        <span className="text-white/80 font-bold tracking-[0.3em] text-xs">🇰🇷 K-DRAMA</span>
                        <span className="text-white font-black text-3xl md:text-5xl tracking-widest"
                            style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>2016</span>
                    </div>
                    <h1 className="text-white text-lg md:text-2xl font-bold mb-2">NĂM CỦA NHỮNG BẢN TÌNH CA VÀ NƯỚC MẮT</h1>
                    <p className="text-purple-200/70 text-sm md:text-base max-w-2xl leading-relaxed">
                        Nếu thanh xuân là một thước phim, chắc chắn 2016 là chương rực rỡ nhất. Có những cái tên đã trở thành "chân ái" mà dù 10 năm sau xem lại, trái tim vẫn lỡ nhịp.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 pt-10">
                {Array.from(new Set(DRAMAS.map(d => d.month))).map(month => {
                    const monthDramas = DRAMAS.filter(d => d.month === month);
                    const monthMovies = monthDramas.map(d => matchMovie(d, movies)).filter(Boolean) as Movie[];
                    if (monthMovies.length === 0) return null;
                    return (
                        <div key={month} className="mb-12">
                            <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-1 h-6 bg-purple-500 rounded-full" />
                                Tháng {month}
                                <span className="ml-auto text-xs text-gray-600">{monthMovies.length} phim</span>
                            </h2>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                {monthMovies.map(movie => (
                                    <MovieCard key={movie._id} movie={movie} />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Missing dramas summary */}
                {notFound.length > 0 && (
                    <div className="mt-10 p-5 rounded-2xl border border-orange-500/20 bg-orange-500/5">
                        <h3 className="text-orange-400 font-bold text-sm mb-3">
                            📭 {notFound.length} bộ phim chưa có trên PCHILL
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {notFound.map(d => (
                                <span key={d.vi} className="text-xs bg-white/5 border border-white/10 text-gray-400 px-3 py-1 rounded-full">
                                    {d.vi}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
