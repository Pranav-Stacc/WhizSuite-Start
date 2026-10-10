import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { t } from '@/shared/i18n/t';
import { getTheme } from '@/shared/theme/theme.server';
import { DEFAULT_THEME } from '@agency-os/contracts';
import { themeToStyle } from '@/shared/theme/theme';
import { Toaster } from '@/shared/ui/toaster';
import { BRAND_ASSETS } from '@/shared/brand/assets';
import './globals.css';

export const metadata: Metadata = {
  title: { default: t('app.name'), template: `%s · ${t('app.name')}` },
  description: t('app.tagline'),
  icons: {
    icon: BRAND_ASSETS.favicon,
    apple: BRAND_ASSETS.appleTouchIcon,
  },
};

export const viewport: Viewport = { themeColor: DEFAULT_THEME.bg, width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getTheme();
  return (
    <html lang="en" style={themeToStyle(theme)} className={`${GeistSans.variable} ${GeistMono.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
