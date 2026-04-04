import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AboutMazeX from "@/components/AboutMazeX";
import WhatIsMicromouse from "@/components/WhatIsMicromouse";
import WorkshopTimeline from "@/components/WorkshopTimeline";
import Delegates from "@/components/Delegates";

import PastEvents from "@/components/PastEvents";
import RegisterCTA from "@/components/RegisterCTA";
import ContactUs from "@/components/ContactUs";
import Footer from "@/components/Footer";
import HexBackground from "@/components/HexBackground";
import { getResolvedSiteEvents } from "@/lib/site-events";
import { listSponsors } from "@/lib/sponsors";
import {
  getConfiguredDelegateBookletHref,
  getSponsorOpeningsEnabled,
} from "@/lib/site-resources";

const Sponsorship = dynamic(() => import("@/components/Sponsorship"));

export const metadata: Metadata = {
  title: "MazeX 1.0 | Micromouse Robotics Competition — IEEE RAS & WIE, University of Moratuwa",
  alternates: {
    canonical: "https://mazex.knurdz.org",
  },
};

export default async function Home() {
  const [sponsors, siteEvents, sponsorOpeningsEnabled, delegateBookletHref] =
    await Promise.all([
    listSponsors(),
    getResolvedSiteEvents(),
    getSponsorOpeningsEnabled(),
    getConfiguredDelegateBookletHref(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "MazeX 1.0 — Micromouse Robotics Workshop Series & Competition",
    description:
      "MazeX 1.0 is an intra-university Micromouse Robotics Workshop Series & Competition organized by IEEE Robotics & Automation Society (RAS) and Women in Engineering (WIE) at the University of Moratuwa. Powered by Knurdz — Knurdz Community, Knurdz Organization.",
    startDate: "2026-06-20",
    endDate: "2026-06-20",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "University of Moratuwa",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Bandaranayake Mawatha",
        addressLocality: "Moratuwa",
        addressCountry: "LK",
      },
    },
    organizer: [
      {
        "@type": "Organization",
        name: "IEEE Robotics & Automation Society — University of Moratuwa Student Branch",
        url: "https://site.ieee.org/sb-moratuwa/chapters/robotics-and-automation-society/",
        sameAs: ["https://site.ieee.org/sb-moratuwa/"],
      },
      {
        "@type": "Organization",
        name: "IEEE Women in Engineering — University of Moratuwa Student Branch",
        url: "https://site.ieee.org/sb-moratuwa/chapters/women-in-engineering/",
      },
    ],
    sponsor: [
      {
        "@type": "Organization",
        name: "Knurdz",
        alternateName: ["Knurdz Community", "Knurdz Organization", "Knurdz Org"],
        url: "https://knurdz.org",
      },
      ...sponsors.map((s) => ({
        "@type": "Organization",
        name: s.title,
        url: s.websiteUrl ?? undefined,
      })),
    ],
    url: "https://mazex.knurdz.org",
    image: "https://mazex.knurdz.org/images/og-image.png",
    keywords:
      "MazeX 1.0, Micromouse, Robotics Competition, IEEE, IEEE RAS, IEEE WIE, RAS, WIE, Knurdz, University of Moratuwa, Sri Lanka",
  };

  return (
    <>
      <Script
        id="mazex-event-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar registerHref={siteEvents.competition.navbarHref} />
      <main className="site-shell">
        <div aria-hidden="true" className="site-background">
          <div className="site-background-glow site-background-glow-primary" />
          <div className="site-background-glow site-background-glow-secondary" />
          <div className="site-background-glow site-background-glow-tertiary" />
          <HexBackground opacity={0.2} />
        </div>
        <Hero />
        <AboutMazeX />
        <WhatIsMicromouse />
        <WorkshopTimeline events={siteEvents.workshops} />
        <Delegates hasDelegateBookletLink={Boolean(delegateBookletHref)} />

        <Sponsorship
          sponsors={sponsors}
          sponsorOpeningsEnabled={sponsorOpeningsEnabled}
        />
        <PastEvents />
        <RegisterCTA competition={siteEvents.competition} />
        <ContactUs />
        <Footer />
      </main>
    </>
  );
}
