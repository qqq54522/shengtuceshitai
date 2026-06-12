import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Lab",
  description: "Internal image generation test bench"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
