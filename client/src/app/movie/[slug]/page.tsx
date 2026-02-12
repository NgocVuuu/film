import { Metadata, ResolvingMetadata } from 'next';
import MovieDetailClient from './MovieDetailClient';
import { API_URL } from '@/lib/config';

export const runtime = 'edge';



type Props = {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function getMovie(slug: string) {
    try {
        const res = await fetch(`${API_URL}/api/movie/${slug}`, { next: { revalidate: 3600 } });
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

    const previousImages = (await parent).openGraph?.images || [];

    return {
        title: `Xem phim ${movie.name} (${movie.year}) ${movie.quality} ${movie.lang} - Pchill`,
        description: `Xem phim ${movie.name} - ${movie.origin_name} (${movie.year}) ${movie.quality} ${movie.lang}. ${movie.content.substring(0, 150)}...`,
        openGraph: {
            title: `${movie.name} (${movie.year}) - Xem phim miễn phí tại Pchill`,
            description: movie.content.substring(0, 200),
            url: `https://pchill.com/movie/${movie.slug}`,
            siteName: 'Pchill',
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
    };
}

export default async function Page({ params }: Props) {
    const slug = (await params).slug;
    const movie = await getMovie(slug);

    return <MovieDetailClient initialMovie={movie} />;
}
