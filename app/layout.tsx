import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description =
  "Sign in with GitHub, pick a repository, and talk to a coding agent running in an isolated sandbox.";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CodeLoom",
    template: "%s · CodeLoom",
  },
  description,
  applicationName: "CodeLoom",
  authors: [{ name: "CodeLoom" }],
  keywords: ["coding agent", "GitHub", "sandbox", "CodeLoom"],
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "CodeLoom",
    title: "CodeLoom",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeLoom",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#16130f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
