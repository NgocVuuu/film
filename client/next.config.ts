import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    exclude: [/middleware-manifest\.json$/, /_buildManifest\.js$/, /_ssgManifest\.js$/, /.*\.(?:map)$/, /app-build-manifest\.json$/],
    skipWaiting: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      // Google Fonts - Long cache (rarely changes)
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
          },
        },
      },
      // Local font files
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-font-assets",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      // Local static images only (NOT external CDN images - they can be huge)
      {
        urlPattern: /^\/_next\/static\/.*\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      // External CDN images (movie posters, thumbnails) - cached with STRICT limits
      // Prevents re-fetching on scroll, allows offline poster viewing
      // maxEntries: 60 ensures storage stays small and Workbox auto-evicts oldest
      {
        urlPattern: /^https?:\/\/.+\.(?:jpg|jpeg|gif|png|webp)(\?.*)?$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "cdn-images",
          expiration: {
            maxEntries: 60,                    // Hard cap - evicts LRU automatically
            maxAgeSeconds: 3 * 24 * 60 * 60,  // 3 days max
          },
        },
      },
      // Next.js Image optimization
      {
        urlPattern: /\/_next\/image\?url=.+$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-image",
          expiration: {
            maxEntries: 32,     // Reduced from 64 to limit storage
            maxAgeSeconds: 3 * 24 * 60 * 60, // 3 days (was 7)
          },
        },
      },
      // Video/audio - NEVER cache (too large, kills storage quota)
      {
        urlPattern: /\.(?:m4v|mpg|avi|m3u8|ts|mp4|mp3|wav|ogg)$/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "media-assets",
        },
      },
      // API calls - NetworkFirst, BUT only cache successful auth responses
      {
        urlPattern: /\/api\/(?!progress\/save).*$/i, // Exclude write endpoints
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
<<<<<<< HEAD
          networkTimeoutSeconds: 8,
=======
          networkTimeoutSeconds: 15,
>>>>>>> main
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 30 * 60, // 30 min (was 1hr - reduces stale auth)
          },
          plugins: [
            {
              // Only cache successful responses - prevents caching 401/500 errors
              cacheWillUpdate: async ({ response }: { response: Response }) => {
                if (response && response.status === 200) {
                  return response;
                }
                return null; // Don't cache errors
              },
            },
          ],
        },
      },
      // Next.js static JS/CSS chunks - these are versioned so safe to cache long
      {
        urlPattern: /^\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: {
            maxEntries: 128,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      // NOTE: Removed the overly broad /^https?.*/ pattern that was
      // catching ALL external requests (CDN images, video CDN, etc.)
      // and causing storage quota overflow after ~1 week of usage.
    ]
  },
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default withPWA(nextConfig);
