import { Metadata, ResolvingMetadata } from 'next';
import MovieDetailClient from './MovieDetailClient';
import { API_URL } from '@/lib/config';
import Script from 'next/script';

export const runtime = 'edge';



type Props = {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function getMovie(slug: string) {
    try {
        const res = await fetch(`${API_URL}/api/movie/${slug}`, { next: { revalidate: 600 } });
        const data = await res.json();
        return data.success ? data.data : null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const slug = (await params).slug;
    const movie = await getMovie(slug);

    if (!movie) {
        return {
            title: 'Phim không tìm thấy - Pchill',
            description: 'Không tìm thấy thông tin phim bạn yêu cầu.'
        };
    }

    const description = movie.content ? movie.content.replace(/<[^>]*>/g, '').substring(0, 150) : 'Xem phim miễn phí chất lượng cao tại Pchill';
    const ogDescription = movie.content ? movie.content.replace(/<[^>]*>/g, '').substring(0, 200) : 'Xem phim miễn phí tại Pchill - Nền tảng xem phim chất lượng cao.';
    const previousImages = (await parent).openGraph?.images || [];

    return {
        title: `Xem phim ${movie.name} (${movie.year}) ${movie.quality} ${movie.lang} - Pchill`,
        description: `Xem phim ${movie.name} - ${movie.origin_name} (${movie.year}) ${movie.quality} ${movie.lang}. ${description}...`,
        keywords: [
            movie.name,
            movie.origin_name,
            `xem phim ${movie.name}`,
            `${movie.name} vietsub`,
            `${movie.name} thuyết minh`,
            ...(movie.category?.map((c: { name: string }) => c.name) || []),
            ...(movie.actor?.slice(0, 5) || []),
        ].filter(Boolean),
        openGraph: {
            title: `${movie.name} (${movie.year}) - Xem phim miễn phí tại Pchill`,
            description: ogDescription,
            url: `https://pchill.online/movie/${movie.slug}`,
            siteName: 'Pchill Movie',
            images: [
                {
                    url: movie.thumb_url || movie.poster_url,
                    width: 800,
                    height: 600,
                },
                ...previousImages,
            ],
            type: 'video.movie',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${movie.name} (${movie.year}) - Pchill`,
            description: ogDescription,
            images: [movie.thumb_url || movie.poster_url],
        },
        alternates: {
            canonical: `https://pchill.online/movie/${movie.slug}`,
        },
    };
}

export default async function Page({ params }: Props) {
    const slug = (await params).slug;
    const movie = await getMovie(slug);

    // JSON-LD Structured Data
    const jsonLd = movie ? {
        '@context': 'https://schema.org',
        '@type': movie.type === 'series' ? 'TVSeries' : 'Movie',
        name: movie.name,
        alternateName: movie.origin_name,
        description: movie.content ? movie.content.replace(/<[^>]*>/g, '').substring(0, 300) : '',
        image: movie.poster_url || movie.thumb_url,
        datePublished: movie.year ? `${movie.year}-01-01` : undefined,
        inLanguage: 'vi',
        genre: movie.category?.map((c: { name: string }) => c.name) || [],
        director: movie.director?.map((d: string) => ({ '@type': 'Person', name: d })) || [],
        actor: movie.actor?.slice(0, 10).map((a: string) => ({ '@type': 'Person', name: a })) || [],
        countryOfOrigin: movie.country?.map((c: { name: string }) => ({ '@type': 'Country', name: c.name })) || [],
        aggregateRating: movie.rating_average && movie.rating_count > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: movie.rating_average.toFixed(1),
            ratingCount: movie.rating_count,
            bestRating: '10',
            worstRating: '1',
        } : undefined,
        url: `https://pchill.online/movie/${movie.slug}`,
    } : null;

    return (
        <>
            {jsonLd && (
                <Script
                    id="json-ld-movie"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                    strategy="beforeInteractive"
                />
            )}
            <MovieDetailClient initialMovie={movie} />
        </>
    );
}
