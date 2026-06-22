import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reels Viewer",
  description: "Browse, tag and curate reels",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
