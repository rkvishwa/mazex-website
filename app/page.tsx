import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AboutMazeX from "@/components/AboutMazeX";
import WhatIsMicromouse from "@/components/WhatIsMicromouse";
import Timeline from "@/components/Timeline";
import Organizers from "@/components/Organizers";
import Sponsorship from "@/components/Sponsorship";
import PastEvents from "@/components/PastEvents";
import RegisterCTA from "@/components/RegisterCTA";
import ContactUs from "@/components/ContactUs";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <AboutMazeX />
      <WhatIsMicromouse />
      <Timeline />
      <Organizers />
      <Sponsorship />
      <PastEvents />
      <RegisterCTA />
      <ContactUs />
      <Footer />
    </main>
  );
}
