import type React from 'react';
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { DeviceManagerProvider } from '@/components/device-manager-provider';
import { Suspense } from 'react';
import { LazorkitRootProvider } from '@/components/lazorkit-provider';
import { WalletSync } from '@/components/wallet-sync';

export const metadata: Metadata = {
  title: 'RampFi',
  description: 'Mobile-first crypto wallet prototype',
  generator: 'v0.app',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                if (typeof window !== 'undefined' && !window.global) { window.global = window; }
              })();
            `,
          }}
        />
        <Suspense fallback={null}>
          <LazorkitRootProvider>
            <ThemeProvider
              attribute='class'
              defaultTheme='dark'
              enableSystem={false}
              disableTransitionOnChange
            >
              <DeviceManagerProvider>
                <WalletSync />
                {children}
                <Toaster />
              </DeviceManagerProvider>
            </ThemeProvider>
          </LazorkitRootProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
