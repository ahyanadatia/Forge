import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/layout/service-worker";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const viewport: Viewport = {
  themeColor: "#f2581c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  applicationName: "Forge",
  appleWebApp: { capable: true, title: "Forge", statusBarStyle: "default" },
  title: { default: "Forge: verified track records for builders", template: "%s · Forge" },
  description:
    "Log what you shipped. Forge verifies it against the live deployment and GitHub, and turns the evidence into a score teams trust.",
  openGraph: {
    title: "Forge: verified track records for builders",
    description:
      "Log what you shipped. Forge verifies it and turns the evidence into a score teams trust.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow">
          Skip to content
        </a>
        {children}
        <ServiceWorkerRegistrar />
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
