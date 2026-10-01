import type { Metadata } from "next";
import { JetBrains_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "CodebaseAI",
  description: "Ask questions about any public GitHub repository.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${mono.variable} ${sans.variable} ${display.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}