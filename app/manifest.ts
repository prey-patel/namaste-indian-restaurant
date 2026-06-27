import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Namaste Indian Restaurant',
    short_name: 'Namaste',
    description: 'Namaste Indian Restaurant Management & KDS Panel',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#040815',
    theme_color: '#d4af37',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
