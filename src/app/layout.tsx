import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/content";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${site.name} — Indian spices & commodities, export-ready`, template: `%s · ${site.name}` },
  description: site.description,
  icons: { icon: "/favicon.svg" },
  openGraph: { title: site.name, description: site.description, siteName: site.name, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
