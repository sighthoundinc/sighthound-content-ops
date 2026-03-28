import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { AlertsProvider } from "@/providers/alerts-provider";
import { NotificationsProvider } from "@/providers/notifications-provider";
import { CommandPalette } from "@/components/command-palette";
import { GlobalQuickCreate } from "@/components/global-quick-create";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
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
        className={`${interSans.variable} ${jetbrainsMono.variable} antialiased`}
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
