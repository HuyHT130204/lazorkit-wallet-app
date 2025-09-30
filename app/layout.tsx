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

export const metadata: Metadata = {
  title: 'LazorKit',
  description: 'Mobile-first crypto wallet prototype',
  generator: 'v0.app',
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
        <Suspense fallback={null}>
          <ThemeProvider
            attribute='class'
            defaultTheme='dark'
            enableSystem={false}
            disableTransitionOnChange
          >
            <DeviceManagerProvider>
              {children}
              <Toaster />
            </DeviceManagerProvider>
          </ThemeProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
