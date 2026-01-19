import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GuShen | AI-Powered Quantitative Trading Platform",
  description:
    "Transform your trading ideas into automated strategies with natural language. No coding required. Powered by advanced AI and VeighNa quantitative framework.",
  keywords: [
    "quantitative trading",
    "AI trading",
    "algorithmic trading",
    "natural language strategy",
    "DeepSeek",
    "VeighNa",
  ],
  authors: [{ name: "Lurus" }],
  openGraph: {
    title: "GuShen | AI-Powered Quantitative Trading",
    description:
      "Describe your strategy in plain language, let AI do the rest.",
    type: "website",
    locale: "zh_CN",
    alternateLocale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-background text-foreground">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
