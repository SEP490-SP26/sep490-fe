import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import Providers from "./Providers";
import { Inter, Montserrat } from 'next/font/google'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
})

const montserrat = Montserrat({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-montserrat',
})

export const metadata: Metadata = {
  title: "Đại Phúc Hải",
  description: "Đại Phúc Hải",
  icons: {
    icon: '/assets/images/icon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
