import dynamic from "next/dynamic";
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

const Sponsorship = dynamic(() => import("@/components/Sponsorship"));

export default async function Home() {
  const [sponsors, siteEvents] = await Promise.all([
    listSponsors(),
    getResolvedSiteEvents(),
  ]);

  return (
    <>
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
        <Delegates />

        <Sponsorship sponsors={sponsors} />
        <PastEvents />
        <RegisterCTA competition={siteEvents.competition} />
        <ContactUs />
        <Footer />
      </main>
    </>
  );
}
