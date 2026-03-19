import { Metadata } from 'next';
import PhimBoClient from './PhimBoClient';

export const metadata: Metadata = {
    title: 'Phim Bộ - Xem Phim Bộ Hay Nhất Online | Pchill',
    description: 'Xem phim bộ hay nhất tại Pchill. Tổng hợp phim bộ Hàn Quốc, Trung Quốc, Mỹ, Thái Lan mới nhất với phụ đề tiếng Việt chất lượng cao.',
    keywords: ['phim bộ', 'phim bộ hay', 'phim bộ mới nhất', 'xem phim bộ online', 'phim series hay'],
    alternates: {
        canonical: 'https://pchill.online/phim-bo',
    },
    openGraph: {
        title: 'Phim Bộ - Xem Phim Bộ Hay Nhất Online | Pchill',
        description: 'Xem phim bộ hay nhất tại Pchill. Tổng hợp phim bộ Hàn Quốc, Trung Quốc, Mỹ mới nhất với phụ đề tiếng Việt.',
        url: 'https://pchill.online/phim-bo',
        type: 'website',
    },
};

export default function PhimBoPage() {
    return <PhimBoClient />;
}