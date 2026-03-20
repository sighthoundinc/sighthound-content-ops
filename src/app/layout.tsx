import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { AlertsProvider } from "@/providers/alerts-provider";
import { NotificationsProvider } from "@/providers/notifications-provider";
import { CommandPalette } from "@/components/command-palette";
import { GlobalQuickCreate } from "@/components/global-quick-create";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sighthound Content Ops",
  description: "Editorial operations dashboard for Sighthound and Redactor workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AlertsProvider>
          <NotificationsProvider>
            <AuthProvider>
              {children}
              <CommandPalette />
              <GlobalQuickCreate />
            </AuthProvider>
          </NotificationsProvider>
        </AlertsProvider>
      </body>
    </html>
  );
}
