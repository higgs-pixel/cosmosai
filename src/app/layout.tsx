import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import type { Viewport } from "next";
import { VercelObservability } from "@/components/analytics/vercel-observability";
import { RetentionVisitTracker } from "@/components/retention/retention-visit-tracker";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  icons: {
  icon: "/favicon.png",
  shortcut: "/favicon.png",
  apple: "/favicon.png",
},

  applicationName: "COSMOS AI",
  title: {
    default: "COSMOS AI | Cinematic Space Exploration",
    template: "%s | COSMOS AI",
  },
  description:
    "Explore NASA data, cosmic imagery, and guided space intelligence through a cinematic space observatory.",
  keywords: [
    "NASA",
    "space exploration",
    "astronomy",
    "APOD",
    "asteroid tracker",
    "solar system",
    "space weather",
  ],
  authors: [{ name: "COSMOS AI" }],
  creator: "COSMOS AI",
  publisher: "COSMOS AI",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "COSMOS AI",
    title: "COSMOS AI | Cinematic Space Exploration",
    description:
      "A premium observatory for NASA imagery, asteroid tracking, space weather, and cinematic planetary exploration.",
  },
  twitter: {
    card: "summary_large_image",
    title: "COSMOS AI | Cinematic Space Exploration",
    description:
      "Explore NASA data, cosmic imagery, and guided space intelligence through a cinematic space observatory.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#03040A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://images-assets.nasa.gov" />
        <link rel="preconnect" href="https://apod.nasa.gov" />
        <link rel="preconnect" href="https://mars.nasa.gov" />
      </head>
      <body className="bg-cosmos-black text-cosmos-white antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <RetentionVisitTracker />
        {children}
        <VercelObservability />
      </body>
      <GoogleAnalytics gaId="G-T05SYW40DP" />
    </html>
  );
}
