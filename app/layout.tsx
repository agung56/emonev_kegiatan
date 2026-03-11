import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "e-Monev Kegiatan",
  description: "Aplikasi rekap kegiatan & anggaran",
  icons: { icon: "/applogo.png",},
};

import { ThemeProvider } from "./components/ThemeContext";
import { ToastProvider } from "./components/ToastContext";
import { ConfirmProvider } from "./components/ConfirmContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (!theme && supportDarkMode) theme = 'dark';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
