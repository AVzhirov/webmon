import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RK Web Monitor — Мониторинг продаж R-Keeper 7",
  description:
    "Современная панель мониторинга продаж R-Keeper 7: выручка, чеки, официанты, планы залов в реальном времени.",
  keywords: [
    "R-Keeper",
    "RK7",
    "WebMonitor",
    "ресторан",
    "мониторинг продаж",
    "выручка",
    "чеки",
  ],
  authors: [{ name: "RK Web Monitor" }],
  openGraph: {
    title: "RK Web Monitor",
    description: "Современная панель мониторинга продаж R-Keeper 7",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
