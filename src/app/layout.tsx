import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AntdAppProvider, AppQueryProvider, AppSessionProvider } from "@/providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clinic Shift Scheduler",
  description: "Manage clinic staff shifts, claims, and coverage.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${GeistSans.variable}`}>
      <body className={inter.className}>
        <AppSessionProvider>
          <AppQueryProvider>
            <AntdAppProvider>{children}</AntdAppProvider>
          </AppQueryProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
