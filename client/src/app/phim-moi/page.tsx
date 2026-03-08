import { Metadata } from 'next';
import PhimMoiClient from './PhimMoiClient';

export const metadata: Metadata = {
    title: 'Phim Mới Cập Nhật - Xem Phim Online Mới Nhất | Pchill',
    description: 'Xem phim mới cập nhật mỗi ngày tại Pchill. Tổng hợp phim mới nhất từ Hàn Quốc, Trung Quốc, Mỹ, Việt Nam với chất lượng cao, phụ đề tiếng Việt đầy đủ.',
    keywords: ['phim mới', 'phim mới cập nhật', 'phim mới nhất', 'xem phim online', 'phim hot 2025'],
    alternates: {
        canonical: 'https://pchill.online/phim-moi',
    },
    openGraph: {
        title: 'Phim Mới Cập Nhật - Xem Phim Online Mới Nhất | Pchill',
        description: 'Xem phim mới cập nhật mỗi ngày tại Pchill. Tổng hợp phim mới nhất với chất lượng cao, phụ đề tiếng Việt.',
        url: 'https://pchill.online/phim-moi',
        type: 'website',
    },
};

export default function PhimMoiPage() {
    return <PhimMoiClient />;
}