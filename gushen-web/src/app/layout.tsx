import type { Metadata } from "next";
import type { ErrorInfo } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { ErrorBoundary } from "@/components/error-boundary";

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

/**
 * Global error handler for ErrorBoundary
 * 全局错误处理回调
 */
function handleGlobalError(error: Error, errorInfo: ErrorInfo): void {
  // Log error to console with context
  console.error("[RootLayout] Global error caught:", error);
  console.error("[RootLayout] Component stack:", errorInfo.componentStack);

  // Future: Send to error tracking service (e.g., Sentry)
  // 未来: 发送到错误追踪服务（如 Sentry）
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-background text-foreground">
        <AuthSessionProvider>
          <ErrorBoundary
            onError={handleGlobalError}
            componentName="App"
          >
            {children}
          </ErrorBoundary>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
