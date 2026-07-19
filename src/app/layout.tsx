import type { Metadata, Viewport } from "next";
import { Archivo, Inter, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { AppStoreProvider } from "@/lib/store";
import { AppShell } from "@/components/layout/AppShell";
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
  title: "GYMA — Workout Tracker",
  description:
    "Tracker di allenamento minimal: catalogo esercizi, routine, sessioni live e progressi. Sync cloud opzionale gratis.",
  applicationName: "GYMA",
};

export const viewport: Viewport = {
  themeColor: "#FAFAF8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} font-body antialiased`}
      >
        <AuthProvider>
          <AppStoreProvider>
            <AppShell>{children}</AppShell>
          </AppStoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
