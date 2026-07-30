import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { AntdAppProvider, AppQueryProvider, AppSessionProvider } from "@/providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const APP_URL = process.env.AUTH_URL ?? "https://atomiciabuild.vercel.app";
const DESCRIPTION =
  "Week-at-a-glance coverage for clinic shifts. Managers schedule and assign, staff claim what fits, and capacity and overlap rules are enforced on the server.";

export const metadata: Metadata = {
  // Required for the file-based OG image to resolve to an absolute URL.
  metadataBase: new URL(APP_URL),
  title: {
    default: "Clinic Shift Scheduler",
    template: "%s · Clinic Shift Scheduler",
  },
  description: DESCRIPTION,
  applicationName: "Clinic Shift Scheduler",
  openGraph: {
    type: "website",
    siteName: "Clinic Shift Scheduler",
    title: "Clinic Shift Scheduler",
    description: DESCRIPTION,
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Clinic Shift Scheduler",
    description: DESCRIPTION,
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#090909",
  colorScheme: "dark",
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
