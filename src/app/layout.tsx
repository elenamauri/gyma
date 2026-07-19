import type { Metadata, Viewport } from "next";
import { Archivo, Inter, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { AppStoreProvider } from "@/lib/store";
import { AppShell } from "@/components/layout/AppShell";
import { IntroSplash } from "@/components/layout/IntroSplash";
import "./globals.css";

const display = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "GYMA",
  description:
    "Tracker di allenamento minimal: catalogo, routine, sessioni live e progressi.",
  applicationName: "GYMA",
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GYMA",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} font-body antialiased overscroll-none`}
      >
        <AuthProvider>
          <AppStoreProvider>
            <IntroSplash />
            <AppShell>{children}</AppShell>
          </AppStoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
