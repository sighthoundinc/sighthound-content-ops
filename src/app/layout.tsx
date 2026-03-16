import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { SystemFeedbackProvider } from "@/providers/system-feedback-provider";
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
  description: "Internal dashboard for Sighthound and Redactor blog operations",
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
        <SystemFeedbackProvider>
          <AuthProvider>
            {children}
            <CommandPalette />
            <GlobalQuickCreate />
          </AuthProvider>
        </SystemFeedbackProvider>
      </body>
    </html>
  );
}
