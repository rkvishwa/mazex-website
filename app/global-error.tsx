"use client";

import { Space_Grotesk, Inter } from "next/font/google";
import { AlertTriangle, MoveRight } from "lucide-react";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}>
        <main className="site-shell min-h-screen flex flex-col">
          <div aria-hidden="true" className="site-background">
            <div className="site-background-glow site-background-glow-primary" />
            <div className="site-background-glow site-background-glow-secondary" />
            <div className="site-background-glow site-background-glow-tertiary" />
          </div>
          
          <div className="flex-1 flex items-center justify-center p-6 relative z-10 w-full max-w-7xl mx-auto">
            <div className="theme-card max-w-xl w-full mx-auto text-center p-10 sm:p-14 space-y-8">
              <div className="mx-auto w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                <AlertTriangle className="w-12 h-12 text-red-500 drop-shadow-sm" />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-100 to-red-300">
                  Critical Multi-System Failure
                </h1>
                <p className="text-base sm:text-lg theme-copy">
                  A critical error occurred that prevented the page from rendering entirely. The engineering team has been notified.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => reset()}
                  className="theme-button rounded-full px-8 py-3.5 text-sm font-medium flex items-center gap-2 group w-full sm:w-auto justify-center transition-all hover:scale-[1.02]"
                >
                  Attempt Recovery
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="theme-button-secondary rounded-full px-8 py-3.5 text-sm font-medium flex items-center gap-2 w-full sm:w-auto justify-center transition-all"
                >
                  Return Home
                  <MoveRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
