import type { Metadata } from "next";
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
  title: "Pchill - Xem Phim Online Miễn Phí",
  description: "Web xem phim miễn phí với giao diện đẹp mắt, cập nhật liên tục.",
};

export const viewport = {
  width: "device-width",
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
