import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elvanis — AI Business Diagnostics",
  description: "Know what's breaking your business before it breaks you. Elvanis reads your real operational data and tells you exactly what to fix.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
{children}
<style>{`
  html[lang="en"] #hubspot-messages-iframe-container {
    right: 20px !important;
    left: auto !important;
  }
  html[lang="ar"] #hubspot-messages-iframe-container,
  html[dir="rtl"] #hubspot-messages-iframe-container {
    left: 20px !important;
    right: auto !important;
  }
`}</style>
<Script
  id="hs-script-loader"
  src="https://js-eu1.hs-scripts.com/148538653.js"
  strategy="afterInteractive"
/>
      </body>
    </html>
  );
}
