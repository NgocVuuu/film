import { Metadata } from 'next';
import MoiCapNhatClient from './MoiCapNhatClient';

export const metadata: Metadata = {
    title: 'Phim Mới Cập Nhật Hôm Nay - Xem Phim Online | Pchill',
    description: 'Danh sách các bộ phim mới được cập nhật hoặc ra mắt trong 24 giờ qua tại Pchill. Cập nhật liên tục nhanh nhất.',
    keywords: ['phim mới cập nhật hôm nay', 'phim vừa ra mắt', 'phim mới', 'xem phim online'],
    alternates: {
        canonical: 'https://pchill.online/moi-cap-nhat',
    },
    openGraph: {
        title: 'Phim Mới Cập Nhật Hôm Nay - Xem Phim Online | Pchill',
        description: 'Danh sách các bộ phim mới được cập nhật trong ngày hôm nay.',
        url: 'https://pchill.online/moi-cap-nhat',
        type: 'website',
    },
};

export default function MoiCapNhatPage() {
    return <MoiCapNhatClient />;
}
