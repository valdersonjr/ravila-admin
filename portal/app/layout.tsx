import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "Ravila's English",
  description: "Portal do aluno — Ravila's English",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ravila's",
  },
  icons: {
    icon: "/logo.svg",
    apple: "/apple-touch-icon.png",
    shortcut: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A86BE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body
        suppressHydrationWarning
        className={`${nunito.variable} font-[family-name:var(--font-nunito)] min-h-full bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
