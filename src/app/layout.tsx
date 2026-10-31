import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { KeyboardShortcutsModal } from '@/components/layout/KeyboardShortcutsModal';
import { ToastProvider } from '@/components/ui/Toast';

const bricolage = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0B0D12',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://algowar.vercel.app'
  ),
  title: {
    default: 'AlgoArena: 1v1 coding duels',
    template: '%s | AlgoArena',
  },
  description:
    '1v1 real-time competitive programming arena with side-by-side execution traces, fair repeatable judging, and hack-and-defend sabotage.',
  applicationName: 'AlgoArena',
  authors: [{ name: 'AlgoArena Engineering Team' }],
  keywords: [
    'competitive programming',
    'esports',
    'dijkstra',
    'graph theory',
    'algorithms',
    'linear',
    'sabotage',
    'monaco editor',
  ],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://algoarena.dev',
    siteName: 'AlgoArena',
    title: 'AlgoArena: 1v1 coding duels',
    description:
      'Real-time 1v1 competitive programming arena with side-by-side execution traces, fair repeatable judging, and hack-and-defend sabotage.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AlgoArena: 1v1 coding duels',
    description:
      'Real-time 1v1 competitive programming arena with side-by-side execution traces, fair repeatable judging, and hack-and-defend sabotage.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0B0D12] text-[#F3F4F6] font-sans selection:bg-sky-500/20 selection:text-sky-200">

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GQSLM0QZH5"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GQSLM0QZH5');
          `}
        </Script>

        <ToastProvider>
          <Navbar />
          <CommandPalette />
          <KeyboardShortcutsModal />
          <main className="flex-1 flex flex-col">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
