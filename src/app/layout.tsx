import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteUrl } from "@/lib/config/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Волчья Хватка — тренировочные шашки и фланкировка",
    template: "%s | Волчья Хватка",
  },
  description: "Тренировочные шашки и видеокурсы по фланкировке.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "Волчья Хватка",
    title: "Волчья Хватка — тренировочные шашки и фланкировка",
    description: "Тренировочные шашки и видеокурсы по фланкировке.",
    images: [
      {
        url: "/images/hero-flankirovka.webp",
        width: 1086,
        height: 1448,
        alt: "Фланкировка тренировочными шашками",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Волчья Хватка — тренировочные шашки и фланкировка",
    description: "Тренировочные шашки и видеокурсы по фланкировке.",
    images: ["/images/hero-flankirovka.webp"],
  },
  icons: {
    icon: [
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
