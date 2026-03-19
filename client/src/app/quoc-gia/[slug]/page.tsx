import { Metadata } from 'next';
import Script from 'next/script';
import CountryPageClient, { COUNTRY_NAMES } from './CountryPageClient';
import LoadingScreen from '@/components/LoadingScreen';
import { API_URL } from '@/lib/config';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const name = COUNTRY_NAMES[slug] || slug;

    return {
        title: `Phim ${name} - Xem Phim ${name} Hay Nhất Online | Pchill`,
        description: `Xem phim ${name} online miễn phí tại Pchill. Tổng hợp phim ${name} mới nhất, hay nhất, đầy đủ vietsub và thuyết minh.`,
        keywords: [`phim ${name}`, `xem phim ${name}`, `phim ${name} vietsub`, `phim ${name} thuyết minh`, `phim ${name} online`, 'pchill'],
        alternates: { canonical: `https://pchill.online/quoc-gia/${slug}` },
        openGraph: {
            title: `Phim ${name} | Pchill Movie`,
            description: `Xem phim ${name} online miễn phí chất lượng cao tại Pchill.`,
            url: `https://pchill.online/quoc-gia/${slug}`,
            siteName: 'Pchill Movie',
            type: 'website',
        },
    };
}

export default async function CountryPage({ params }: Props) {
    const { slug } = await params;
    const name = COUNTRY_NAMES[slug] || slug;

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://pchill.online' },
            { '@type': 'ListItem', position: 2, name: 'Quốc gia', item: 'https://pchill.online/quoc-gia' },
            { '@type': 'ListItem', position: 3, name: `Phim ${name}`, item: `https://pchill.online/quoc-gia/${slug}` },
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
            <CountryPageClient />
        </>
    );
}
