import { useState, useEffect, Suspense } from 'react';
import Script from 'next/script';
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Dancing_Script } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/MainLayout";
import { ToastProvider } from "@/components/toast-provider";
import { AuthProvider } from "@/contexts/auth-context";
import ChatWidget from "@/components/ChatWidget";
import { AdInterstitial } from "@/components/AdInterstitial";
import { GlobalPopunder } from "@/components/GlobalPopunder";
import { QuickViewProvider } from "@/contexts/QuickViewContext";
import DisableDevTools from "@/components/DisableDevTools";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["vietnamese", "latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pchill.online"),
  title: "Pchill Movie - Xem Phim Online Miễn Phí",
  description: "Web xem phim miễn phí với giao diện đẹp mắt, cập nhật liên tục những bộ phim mới nhất.",
  manifest: "/manifest.json",
  keywords: ["xem phim", "phim online", "phim moi", "pchill", "xem phim free"],
  openGraph: {
    title: "Pchill Movie - Xem Phim Online Miễn Phí",
    description: "Web xem phim miễn phí với giao diện đẹp mắt, cập nhật liên tục.",
    url: "https://pchill.online",
    siteName: "Pchill Movie",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Pchill Movie Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pchill Movie - Xem Phim Online Miễn Phí",
    description: "Web xem phim miễn phí với giao diện đẹp mắt, cập nhật liên tục.",
    images: ["/logo.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pchill Movie",
  },
  icons: {
    icon: [
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#eab308",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <head>
        {/* Monetag site verification */}
        <meta name="monetag" content="26e1e1d22ee4c5614e8de995adabf77a" />
        {/* Site verification */}
        <meta name="ebe695271899b75b0f5d56c12e97da002a5d082d" content="ebe695271899b75b0f5d56c12e97da002a5d082d" />
        {/* Referrer policy — giúp mạng quảng cáo nhận đủ referrer, tăng doanh thu ~20% */}
        <meta name="referrer" content="no-referrer-when-downgrade" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RNRM206SY8"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-RNRM206SY8');
          `}
        </Script>
        <Script
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
          strategy="beforeInteractive"
        />
      
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} antialiased min-h-screen flex flex-col bg-deep-black text-foreground overflow-x-hidden`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <QuickViewProvider>
            <DisableDevTools />
            <MainLayout>
              {children}
            </MainLayout>
            <Suspense fallback={null}>
              <ChatWidget />
            </Suspense>
            <Suspense fallback={null}>
              <AdInterstitial />
              </Suspense>
              <Suspense fallback={null}>
                <GlobalPopunder />
            </Suspense>
            <ToastProvider />
          </QuickViewProvider>
        </AuthProvider>
      </body>
    </html>
  );
}



