import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AboutMazeX from "@/components/AboutMazeX";
import WhatIsMicromouse from "@/components/WhatIsMicromouse";
import WorkshopTimeline from "@/components/WorkshopTimeline";
import Delegates from "@/components/Delegates";
import Organizers from "@/components/Organizers";
import Sponsorship from "@/components/Sponsorship";
import PastEvents from "@/components/PastEvents";
import RegisterCTA from "@/components/RegisterCTA";
import ContactUs from "@/components/ContactUs";
import Footer from "@/components/Footer";
import HexBackground from "@/components/HexBackground";

export default function Home() {
  return (
    <>
      <Navbar />
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
        <WorkshopTimeline />
        <Delegates />
        <Organizers />
        <Sponsorship />
        <PastEvents />
        <RegisterCTA />
        <ContactUs />
        <Footer />
      </main>
    </>
  );
}
