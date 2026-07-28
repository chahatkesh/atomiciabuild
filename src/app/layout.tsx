import type { Metadata } from "next";

import { AntdAppProvider, AppQueryProvider, AppSessionProvider } from "@/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Clinic Shift Scheduler",
  description: "Manage clinic staff shifts, claims, and coverage.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppSessionProvider>
          <AppQueryProvider>
            <AntdAppProvider>{children}</AntdAppProvider>
          </AppQueryProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
