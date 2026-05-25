import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import PageTransition from "@/components/PageTransition";
import CursorGlow from "@/components/CursorGlow";
import ScrollProgressBar from "@/components/ScrollProgressBar";

export const metadata: Metadata = {
  title: "Bloom AI — Agentic Finance, Fully On-Chain",
  description:
    "The world's first AI-driven financial media and copy-trading network powered by SoSoValue, SSI Protocol, and SoDEX. From macro intelligence to on-chain execution.",
  openGraph: {
    title: "Bloom AI",
    description: "Agentic Finance, Fully On-Chain",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/bloom.png" type="image/png" />
        <link rel="apple-touch-icon" href="/bloom.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-bloom-bg text-bloom-text antialiased">
        <ScrollProgressBar />
        <CursorGlow />
        <Providers>
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
