import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "VideoChat",
  description: "Видеочат с комнатами",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} min-h-dvh`}>
      <body className="flex min-h-dvh flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-[family-name:var(--font-geist-sans)] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
