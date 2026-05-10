import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reflect｜心情反思日記",
  description: "每日心情反思日記",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
