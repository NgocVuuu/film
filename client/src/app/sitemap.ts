import { MetadataRoute } from 'next'
import { API_URL } from '@/lib/config';

const BASE_URL = 'https://pchill.online';

// Danh sách thể loại có nội dung
const CATEGORY_SLUGS = [
    'hanh-dong', 'tinh-cam', 'hai-huoc', 'co-trang', 'tam-ly', 'hinh-su',
    'chien-tranh', 'vo-thuat', 'vien-tuong', 'phieu-luu', 'khoa-hoc',
    'kinh-di', 'am-nhac', 'than-thoai', 'tai-lieu', 'gia-dinh', 'chinh-kich',
    'bi-an', 'hoc-duong', 'short-drama',
];

// Danh sách quốc gia có nội dung
const COUNTRY_SLUGS = [
    'trung-quoc', 'han-quoc', 'thai-lan', 'nhat-ban', 'au-my',
    'hong-kong', 'viet-nam', 'an-do',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 1. Static Routes - trang chính
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
        { url: `${BASE_URL}/phim-moi`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${BASE_URL}/phim-bo`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${BASE_URL}/phim-le`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: `${BASE_URL}/hoat-hinh`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${BASE_URL}/tv-shows`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: `${BASE_URL}/marvel`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE_URL}/dcu`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    ];

    // 2. Thể loại routes
    const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map(slug => ({
        url: `${BASE_URL}/the-loai/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }));

    // 3. Quốc gia routes
    const countryRoutes: MetadataRoute.Sitemap = COUNTRY_SLUGS.map(slug => ({
        url: `${BASE_URL}/quoc-gia/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }));

    // 4. Movie routes - lấy toàn bộ phim từ sitemap endpoint
    let movieRoutes: MetadataRoute.Sitemap = [];
    try {
        const res = await fetch(`${API_URL}/api/movies/sitemap`, {
            next: { revalidate: 3600 }, // cache 1 giờ
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                movieRoutes = data.data.map((movie: { slug: string; updatedAt?: string; createdAt?: string }) => {
                    const dateString = movie.updatedAt || movie.createdAt;
                    let lastModifiedDate = new Date();
                    if (dateString) {
                        const parsed = new Date(dateString);
                        if (!isNaN(parsed.getTime())) lastModifiedDate = parsed;
                    }
                    return {
                        url: `${BASE_URL}/movie/${movie.slug}`,
                        lastModified: lastModifiedDate,
                        changeFrequency: 'weekly' as const,
                        priority: 0.8,
                    };
                });
            }
        }
    } catch (error) {
        console.error('Failed to generate movie sitemap:', error);
    }

    return [...staticRoutes, ...categoryRoutes, ...countryRoutes, ...movieRoutes];
}
