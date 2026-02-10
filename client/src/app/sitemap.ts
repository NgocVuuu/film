import { MetadataRoute } from 'next'
import { API_URL } from '@/lib/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Static Routes
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: 'https://pchill.com',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: 'https://pchill.com/phim-moi',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://pchill.com/phim-bo',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: 'https://pchill.com/phim-le',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
    ];

    // Dynamic Routes
    let movieRoutes: MetadataRoute.Sitemap = [];
    try {
        const res = await fetch(`${API_URL}/api/movies?limit=200`); // Fetch recent 200 movies
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            movieRoutes = data.data.map((movie: any) => ({
                url: `https://pchill.com/movie/${movie.slug}`,
                lastModified: new Date(movie.updatedAt || movie.createdAt),
                changeFrequency: 'daily',
                priority: 0.7,
            }));
        }
    } catch (error) {
        console.error('Failed to generate sitemap:', error);
    }

    return [...staticRoutes, ...movieRoutes];
}
