import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import HashScrollManager from "@/components/HashScrollManager";
import AppRouteDecorations from "@/components/AppRouteDecorations";
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

export const metadata: Metadata = {
  title: "MazeX 1.0 | Micromouse Robotics Competition — University of Moratuwa",
  description:
    "MazeX 1.0 is an intra-university Micromouse Robotics Competition organized by IEEE RAS and WIE at the University of Moratuwa. Register by 05/05/2026. Competition Day: 20/06/2026.",
  keywords:
    "Micromouse, Robotics, IEEE, University of Moratuwa, RAS, WIE, MazeX, Competition, Sri Lanka",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}
      >
        <HashScrollManager />
        {children}
        <AppRouteDecorations />
      </body>
    </html>
  );
}
