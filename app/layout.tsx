import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jbm = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbm', display: 'swap' });

export const metadata: Metadata = {
  title: 'Vametrix Engine — Autonomous AI for sales + marketing',
  description: 'One AI engine that runs your entire growth motion — from the ad click to the closed deal. Built for Indian businesses.',
  metadataBase: new URL('https://www.vametrix.com'),
  openGraph: {
    title: 'Vametrix Engine — Your sales + marketing on autopilot',
    description: 'One AI engine. From click to closed deal. Replace 12 tools.',
    type: 'website',
  },
};

// Clean root layout. The (app) route group adds the sidebar + auth gate.
// Marketing (/) and /login render directly inside this shell — no chrome.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jbm.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
