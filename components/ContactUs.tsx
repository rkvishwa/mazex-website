"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useMemo } from "react";

const TEAM_MEMBERS = [
  {
    name: "Chanuru Dewnitha",
    role: "Chair",
    phone: "0788119064",
    email: "chaniruranawaka@gmail.com",
    image: "/images/team/Chair_DP.jpeg",
  },
  {
    name: "Rashmika Wellappili",
    role: "Vice Chair",
    phone: "0706270500",
    email: "rashmikarw@gmail.com",
    image: "/images/team/Vice_Chair3_DP.jpeg",
  },
  {
    name: "Sarjana Shanmugarajah",
    role: "Vice Chair",
    phone: "0750744233",
    email: "sar03jana@gmail.com",
    image: "/images/team/Vice_Chair1_DP.jpeg",
  },
  {
    name: "Raneesha Fernando",
    role: "Vice Chair",
    phone: "0779811166",
    email: "raneesha0925@gmail.com",
    image: "/images/team/Vice_Chair2_DP.jpeg",
  },
  {
    name: "Sasindu Wellage",
    role: "Finance Committee Lead",
    phone: "0769389061",
    email: "wellagesasindu@gmail.com",
    image: "/images/team/Finance_committee_lead_DP.jpeg",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const hexVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

const Hexagon = ({
  children,
  className = "",
  isCenter = false,
}: {
  children: React.ReactNode;
  className?: string;
  isCenter?: boolean;
}) => (
  <motion.div
    variants={hexVariants}
    className={`relative aspect-[0.866/1] w-full ${className}`}
  >
    <div
      className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${
        isCenter
          ? "from-[#A855F7] to-[#818CF8] opacity-25 blur-[30px]"
          : "from-[#A855F7]/30 to-[#818CF8]/30 opacity-0 group-hover:opacity-100 blur-[20px]"
      }`}
      style={{
        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      }}
    />
    <div
      className={`group relative h-full w-full transition-all duration-500 ${
        !isCenter ? "hover:-translate-y-2" : ""
      }`}
      style={{
        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      }}
    >
      <div
        className={`absolute inset-[1.5px] bg-gradient-to-b ${
          isCenter
            ? "from-[#A855F7] to-[#818CF8]"
            : "from-[#1a1b2e] to-[#0f1021] border border-maze-border/20 transition-colors duration-500 group-hover:from-[#A855F7]/25 group-hover:to-[#818CF8]/15"
        }`}
        style={{
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        }}
      />
      <div
        className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-4 sm:p-6 text-center ${
          isCenter ? "text-white" : ""
        }`}
      >
        {children}
      </div>
    </div>
  </motion.div>
);

export default function ContactUs() {
  const hexSize = 250;
  const gap = 8;
  
  const hexPositions = useMemo(() => {
    const w = hexSize + gap;
    const h = (hexSize / 0.866) + gap;
    
    return [
      { x: -0.5 * w, y: -0.75 * h }, // 0: Top-Left
      { x: 0.5 * w, y: -0.75 * h },  // 1: Top-Right
      { x: w, y: 0 },                // 2: Right
      { x: 0.5 * w, y: 0.75 * h },   // 3: Bottom-Right
      { x: -0.5 * w, y: 0.75 * h },  // 4: Bottom-Left
      { x: -w, y: 0 },               // 5: Left
    ];
  }, []);

  return (
    <section id="contact" className="theme-section-alt relative overflow-hidden py-24 lg:py-40">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-[#A855F7]/8 opacity-20 blur-[200px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-[#818CF8]/8 opacity-20 blur-[180px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 font-heading">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="relative flex flex-col items-center justify-center gap-12 lg:gap-0 lg:h-[800px]"
        >
          {/* CENTER HUB */}
          <div className="lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 w-full max-w-[250px] z-30 order-first lg:order-none">
            <Hexagon isCenter>
              <div className="flex flex-col items-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20">
                   <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                   </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-[0.3em] leading-tight text-white drop-shadow-md">
                  Contact <br /> Us
                </h2>
              </div>
            </Hexagon>
          </div>

          {/* CONTACT CARDS */}
          {TEAM_MEMBERS.map((member, index) => {
            // Swap Raneesha Fernando (index 3) with index 5 (Previously Decorative)
            let posIndex = index;
            if (index === 3) posIndex = 5; // Raneesha moves to Left pos
            
            const pos = hexPositions[posIndex];
            return (
              <div
                key={member.email}
                className="w-full max-w-[250px] lg:absolute lg:top-1/2 lg:left-1/2"
                style={{
                  '--tx': `${pos.x}px`,
                  '--ty': `${pos.y}px`
                } as any}
              >
                <div className="lg:[transform:translate(calc(-50%+var(--tx)),calc(-50%+var(--ty)))]">
                  <Hexagon>
                    <div className="flex flex-col items-center w-full">
                      <div className="relative mb-3 h-20 w-20 overflow-hidden rounded-full ring-2 ring-maze-border/40 transition-all duration-500 group-hover:ring-[#A855F7]/60 shadow-xl">
                        <Image
                          src={member.image}
                          alt={member.name}
                          fill
                          className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110"
                        />
                      </div>
                      
                      <h3 className="mb-0.5 text-xs sm:text-sm font-bold tracking-tight text-[#F8FAFC]">
                        {member.name}
                      </h3>
                      
                      <span className="mb-3 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.16em] text-[#C084FC]">
                        {member.role}
                      </span>

                      <div className="flex flex-col gap-0.5 items-center">
                        <a
                          href={`tel:${member.phone}`}
                          className="text-[9px] sm:text-[10px] font-medium text-[#c9bedb] hover:text-[#F8FAFC] transition-colors"
                        >
                          {member.phone}
                        </a>
                        <a
                          href={`mailto:${member.email}`}
                          className="text-[8px] sm:text-[9px] text-[#9e8db3] hover:text-[#F8FAFC] transition-colors truncate max-w-[170px]"
                        >
                          {member.email}
                        </a>
                      </div>
                    </div>
                  </Hexagon>
                </div>
              </div>
            );
          })}

          {/* DECORATIVE HEX (New position: Bottom-Right, index 3) */}
          <div 
            className="hidden lg:block lg:absolute lg:top-1/2 lg:left-1/2 opacity-10"
            style={{
              '--tx': `${hexPositions[3].x}px`,
              '--ty': `${hexPositions[3].y}px`
            } as any}
          >
            <div className="w-[250px] lg:[transform:translate(calc(-50%+var(--tx)),calc(-50%+var(--ty)))]">
               <Hexagon>
                <div className="h-full w-full flex items-center justify-center">
                  <div className="h-8 w-8 border border-dashed border-[#A855F7]/30 rounded-full animate-pulse" />
                </div>
               </Hexagon>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
