import type { Metadata } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import { CartProvider } from '@/components/providers/CartProvider';
import { GiridharAiWidget } from '@/components/storefront/GiridharAiWidget';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const appUrl = process.env.APP_URL?.startsWith('http') ? process.env.APP_URL : 'https://giridharfashion.com';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'GIRIDHAR FASHION — Modern Minimal Luxury Menswear',
    template: '%s | GIRIDHAR FASHION',
  },
  description:
    'Modern, minimal, distinct luxury menswear crafted in Bangladesh. Shop tailored shirts, heavyweight hoodies, cable knit sweaters, and trousers.',
  openGraph: {
    title: 'GIRIDHAR FASHION — Modern Minimal Luxury Menswear',
    description:
      'Modern, minimal, distinct luxury menswear crafted in Bangladesh. Shop tailored shirts, heavyweight hoodies, cable knit sweaters, and trousers.',
    type: 'website',
    siteName: 'GIRIDHAR FASHION',
    images: ['/assets/aistudio/image_32af7105.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GIRIDHAR FASHION — Modern Minimal Luxury Menswear',
    description:
      'Modern, minimal, distinct luxury menswear crafted in Bangladesh.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: 'GIRIDHAR FASHION',
    description: 'Modern Minimal Luxury Menswear in Bangladesh.',
    url: appUrl,
    priceRange: '৳1,190 - ৳3,500',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'House 24, Road 11, Banani',
      addressLocality: 'Dhaka',
      postalCode: '1213',
      addressCountry: 'BD',
    },
  };

  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable}`}>
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
