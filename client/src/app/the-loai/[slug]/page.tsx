import { Metadata } from 'next';
import Script from 'next/script';
import CategoryPageClient, { CATEGORY_NAMES } from './CategoryPageClient';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
    'hanh-dong': 'Hành động kịch tính, pha cà mãn nhãn, võ thuật đỉnh cao',
    'tinh-cam': 'Tình yêu lãng mạn, xúc động, cảm xúc sâu sắc',
    'hai-huoc': 'Hài hước vô tuyến, cười nào thấy đã xem',
    'co-trang': 'Cổ trang đẹp mắt, cốt truyện lịch sử hấp dẫn',
    'tam-ly': 'Tâm lý phức tạp, nhân vật chiều sâu',
    'hinh-su': 'Hình sự gây cấn, điều tra tội phạm hấp dẫn',
    'kinh-di': 'Kinh dị rùng rợn, đáng sợ nhất màn ảnh',
    'vien-tuong': 'Viễn tưởng khoa học, thế giới tương lai bục phá',
    'phieu-luu': 'Phiêu lưu mạo hiểm, hành trình thú vị',
    'than-thoai': 'Thần thoại kỳ ảo, thế giới huyền bí',
    'chien-tranh': 'Chiến tranh anh hùng, cảm xúc sâu sắc',
    'tai-lieu': 'Tài liệu chân thực, khám phá thế giới',
    'gia-dinh': 'Gia đình ấm áp, phù hợp mọi lứa tuổi',
    'bi-an': 'Bí ẩn lạnh gáy, khởp ngoặt bất ngờ',
    'hoc-duong': 'Học đường trong sáng, tình bạn tuổi thơ',
    'vo-thuat': 'Võ thuật đỉnh cao, mãn nhãn từng phân cảnh',
    'short-drama': 'Short drama ngắn gọn, hấp dẫn từng tập',
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const name = CATEGORY_NAMES[slug] || slug;
    const desc = CATEGORY_DESCRIPTIONS[slug] || `Xem phim ${name} online miễn phí chất lượng cao`;

    return {
        title: `Phim ${name} - Xem Phim ${name} Hay Nhất | Pchill`,
        description: `Xem phim ${name} online miễn phí tại Pchill. ${desc}. Cập nhật phim mới nhất, vietsub, thuyết minh.`,
        keywords: [`phim ${name}`, `xem phim ${name}`, `phim ${name} vietsub`, `phim ${name} thuyết minh`, `phim ${name} online`, 'pchill'],
        alternates: { canonical: `https://pchill.online/the-loai/${slug}` },
        openGraph: {
            title: `Phim ${name} | Pchill Movie`,
            description: `Xem phim ${name} online miễn phí chất lượng cao tại Pchill. ${desc}.`,
            url: `https://pchill.online/the-loai/${slug}`,
            siteName: 'Pchill Movie',
            type: 'website',
        },
    };
}

export default async function CategoryPage({ params }: Props) {
    const { slug } = await params;
    const name = CATEGORY_NAMES[slug] || slug;

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://pchill.online' },
            { '@type': 'ListItem', position: 2, name: 'Thể loại', item: 'https://pchill.online/the-loai' },
            { '@type': 'ListItem', position: 3, name: `Phim ${name}`, item: `https://pchill.online/the-loai/${slug}` },
        ],
    };

    return (
        <>
            <Script
                id="breadcrumb-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
                strategy="beforeInteractive"
            />
            <CategoryPageClient />
        </>
    );
}
