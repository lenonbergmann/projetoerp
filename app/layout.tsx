// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"; // ✅ importar
import AppShell from "@/components/layout/AppShell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "DEPAULA BPO", template: "%s — DEPAULA BPO" },
  description: "Sistema financeiro",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: APP_URL,
    title: "DEPAULA BPO",
    description: "Sistema financeiro",
    siteName: "DEPAULA BPO",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DEPAULA BPO" }],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "DEPAULA BPO",
    description: "Sistema financeiro",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ✅ mover suppressHydrationWarning para o <html>
    <html lang="pt-BR" dir="ltr" suppressHydrationWarning>
      {/* ✅ use tokens do shadcn: bg-background / text-foreground */}
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-background text-foreground antialiased`}>
        {/* ✅ envolver a app com ThemeProvider */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
