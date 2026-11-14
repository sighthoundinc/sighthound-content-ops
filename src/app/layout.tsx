import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { AlertsProvider } from "@/providers/alerts-provider";
import { NotificationsProvider } from "@/providers/notifications-provider";
import { AIAssistantProvider } from "@/providers/ai-assistant-provider";
import { CommandPalette } from "@/components/command-palette";
import { GlobalQuickCreate } from "@/components/global-quick-create";
import { AIFloatingAssistant } from "@/components/ai/ai-floating-assistant";

// Sighthound Content Relay primary sans: Lexend (weights 300/400/500/600/700).
// Exposed as --font-lexend-sans. Tailwind's `font-sans` and body default
// resolve to this via `@theme inline { --font-sans: var(--font-lexend-sans) }`
// in globals.css.
// Fonts are self-hosted (src/app/fonts, OFL-licensed variable fonts) so
// builds never depend on fetching from Google Fonts.
const lexendSans = localFont({
  src: "./fonts/lexend-latin-variable.woff2",
  variable: "--font-lexend-sans",
  weight: "100 900",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin-variable.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
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
        className={`${lexendSans.variable} ${jetbrainsMono.variable} antialiased`}
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
