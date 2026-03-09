import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "e-Monev Kegiatan",
  description: "Aplikasi rekap kegiatan & anggaran",
  icons: { icon: "/applogo.png",},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
