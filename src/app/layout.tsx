import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { AlertsProvider } from "@/providers/alerts-provider";
import { NotificationsProvider } from "@/providers/notifications-provider";
import { AIAssistantProvider } from "@/providers/ai-assistant-provider";
import { CommandPalette } from "@/components/command-palette";
import { GlobalQuickCreate } from "@/components/global-quick-create";
import { AIFloatingAssistant } from "@/components/ai/ai-floating-assistant";

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
  title: "Sighthound Content Relay",
  description: "Content workflow relay for Sighthound and Redactor publishing teams",
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
              <AIAssistantProvider>
                {children}
                <CommandPalette />
                <GlobalQuickCreate />
                <AIFloatingAssistant />
              </AIAssistantProvider>
            </AuthProvider>
          </NotificationsProvider>
        </AlertsProvider>
      </body>
    </html>
  );
}
