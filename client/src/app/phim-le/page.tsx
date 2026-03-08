import { Metadata } from 'next';
import PhimLeClient from './PhimLeClient';

export const metadata: Metadata = {
    title: 'Phim Lẻ - Xem Phim Lẻ Hay Nhất Online | Pchill',
    description: 'Xem phim lẻ hay nhất tại Pchill. Tổng hợp phim lẻ mới nhất từ Hàn Quốc, Mỹ, Trung Quốc, Châu Âu với chất lượng cao, phụ đề tiếng Việt đầy đủ.',
    keywords: ['phim lẻ', 'phim lẻ hay', 'phim lẻ mới nhất', 'xem phim lẻ online', 'phim chiếu rạp'],
    alternates: {
        canonical: 'https://pchill.online/phim-le',
    },
    openGraph: {
        title: 'Phim Lẻ - Xem Phim Lẻ Hay Nhất Online | Pchill',
        description: 'Xem phim lẻ hay nhất tại Pchill. Tổng hợp phim lẻ mới nhất với chất lượng cao, phụ đề tiếng Việt.',
        url: 'https://pchill.online/phim-le',
        type: 'website',
    },
};

export default function PhimLePage() {
    return <PhimLeClient />;
}