import type { Metadata, Viewport } from 'next';
import { CartProvider } from '@/components/providers/CartProvider';
import { GiridharAiWidget } from '@/components/storefront/GiridharAiWidget';
import './globals.css';

const appUrl = process.env.APP_URL?.startsWith('http')
  ? process.env.APP_URL
  : 'https://giridhar-fashion.vercel.app';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'GIRIDHAR FASHION — Modern Minimal Luxury Menswear',
    template: '%s | GIRIDHAR FASHION',
  },
  description:
    'Modern, minimal, distinct menswear crafted in Bangladesh. Explore the GIRIDHAR FASHION collection.',
  openGraph: {
    title: 'GIRIDHAR FASHION — Modern Minimal Luxury Menswear',
    description:
      'Modern, minimal, distinct menswear crafted in Bangladesh.',
    type: 'website',
    siteName: 'GIRIDHAR FASHION',
    images: ['/assets/aistudio/image_32af7105.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GIRIDHAR FASHION — Modern Minimal Luxury Menswear',
    description: 'Modern, minimal, distinct menswear crafted in Bangladesh.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: 'GIRIDHAR FASHION',
    description: 'Modern Minimal Luxury Menswear in Bangladesh.',
    url: appUrl,
  };

  return (
    <html lang="en">
      <body suppressHydrationWarning className="min-h-screen bg-[#FAF9F6] text-[#242424] antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <CartProvider>
          {children}
          <GiridharAiWidget />
        </CartProvider>
      </body>
    </html>
  );
}
