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
  title: "MazeX 1.0 | Micromouse Robotics Competition — IEEE RAS & WIE, University of Moratuwa",
  description:
    "MazeX 1.0 is an intra-university Micromouse Robotics Workshop Series & Competition organized by IEEE Robotics & Automation Society and Women in Engineering at University of Moratuwa. Powered by Knurdz. Register by 05/05/2026. Competition Day: 20/06/2026.",
  keywords: [
    "MazeX 1.0",
    "MazeX",
    "Micromouse",
    "Micromouse Competition",
    "Micromouse Workshop",
    "Robotics Competition",
    "Robotics Workshop",
    "IEEE",
    "IEEE RAS",
    "IEEE Robotics & Automation Society",
    "IEEE Robotics and Automation Society",
    "RAS",
    "IEEE WIE",
    "WIE",
    "Women in Engineering",
    "Women in Engineering at University of Moratuwa",
    "IEEE Student Branch",
    "University of Moratuwa",
    "Moratuwa",
    "Sri Lanka",
    "knurdz",
    "Knurdz",
    "Knurdz Community",
    "Knurdz Organization",
    "Knurdz Org",
    "maze solving robot",
    "autonomous robot",
    "intra-university competition",
    "embedded systems",
    "algorithm development",
    "robotics Sri Lanka",
    "IEEE student competition",
  ],
  authors: [{ name: "Knurdz", url: "https://knurdz.org" }],
  creator: "Knurdz",
  publisher: "IEEE Student Branch, University of Moratuwa",
  category: "Technology, Robotics, Education",
  metadataBase: new URL("https://mazex.knurdz.org"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mazex.knurdz.org",
    siteName: "MazeX 1.0",
    title: "MazeX 1.0 | Micromouse Robotics Competition — IEEE RAS & WIE, University of Moratuwa",
    description:
      "MazeX 1.0 is an intra-university Micromouse Robotics Workshop Series & Competition organized by IEEE Robotics & Automation Society and Women in Engineering at University of Moratuwa. Powered by Knurdz. Register by 05/05/2026. Competition Day: 20/06/2026.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "MazeX 1.0 — Micromouse Robotics Competition by IEEE RAS & WIE, University of Moratuwa",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MazeX 1.0 | Micromouse Robotics Competition — IEEE RAS & WIE, UOM",
    description:
      "An intra-university Micromouse Robotics Workshop Series & Competition organized by IEEE RAS & WIE at University of Moratuwa. Powered by Knurdz.",
    images: ["/images/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
        suppressHydrationWarning
      >
        <HashScrollManager />
        {children}
        <AppRouteDecorations />
      </body>
    </html>
  );
}
