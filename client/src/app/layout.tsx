import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/MainLayout";
import { ToastProvider } from "@/components/toast-provider";
import { AuthProvider } from "@/contexts/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-deep-black text-foreground overflow-x-hidden`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <MainLayout>
            {children}
          </MainLayout>
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
