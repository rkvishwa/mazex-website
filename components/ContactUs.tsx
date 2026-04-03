"use client";

import { motion, Variants } from "framer-motion";
import ImageWithSkeleton from "./ImageWithSkeleton";
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
  {
    name: "M.A.N.S.Mewanya",
    role: "Team handling lead",
    phone: "0772042592",
    email: "niyumimewanya00@gmail.com",
    image: "/images/team/Team_handling_lead_DP.png",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const hexVariants: Variants = {
  hidden: (custom) => ({
    opacity: 0,
    scale: 0.5,
    x: custom?.x ? -custom.x : 0,
    y: custom?.y ? -custom.y : 0,
  }),
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 60,
      damping: 20,
      mass: 1,
    },
  },
};

const Hexagon = ({
  children,
  className = "",
  isCenter = false,
  custom = null,
}: {
  children: React.ReactNode;
  className?: string;
  isCenter?: boolean;
  custom?: any;
}) => (
  <motion.div
    variants={hexVariants}
    custom={custom}
    className={`group relative aspect-[0.866/1] w-full pointer-events-none ${className}`}
  >
    <div
      className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 pointer-events-none ${
        isCenter
          ? "from-[#A855F7] to-[#818CF8] opacity-25 blur-[1.875rem]"
          : "from-[#A855F7]/30 to-[#818CF8]/30 opacity-0 group-hover:opacity-100 blur-[1.25rem]"
      }`}
      style={{
        clipPath:
          "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      }}
    />
    <div
      className={`relative h-full w-full transition-all duration-500 pointer-events-auto ${
        !isCenter ? "group-hover:-translate-y-2" : "cursor-pointer"
      }`}
      style={{
        clipPath:
          "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      }}
    >
      <div
        className={`absolute inset-[0.0938rem] bg-gradient-to-b ${
          isCenter
            ? "from-[#A855F7] to-[#818CF8]"
            : "from-[#1a1b2e] to-[#0f1021] border border-maze-border/20 transition-colors duration-500 group-hover:from-[#A855F7]/25 group-hover:to-[#818CF8]/15"
        }`}
        style={{
          clipPath:
            "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
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

const MobileContactCard = ({ member }: { member: (typeof TEAM_MEMBERS)[0] }) => (
  <motion.div
    variants={hexVariants}
    className="theme-card-soft group relative flex items-center gap-[1rem] p-[1.25rem] transition-all duration-300 hover:border-[#A855F7]/40 w-full"
  >
    {/* Card Glow Effect */}
    <div className="absolute inset-0 bg-[#A855F7]/5 opacity-0 group-hover:opacity-100 blur-[1rem] transition-opacity duration-500 pointer-events-none" />

    <div className="relative h-[4.5rem] w-[4.5rem] flex-shrink-0 overflow-hidden rounded-full ring-[0.125rem] ring-maze-border/40 transition-all duration-500 group-hover:ring-[#A855F7]/60 shadow-lg">
      <ImageWithSkeleton
        src={member.image}
        alt={member.name}
        fill
        sizes="72px"
        className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105"
      />
    </div>

    <div className="flex flex-col gap-[0.25rem] z-10 min-w-0">
      <h3 className="text-[1rem] font-bold text-[#F8FAFC] leading-tight">
        {member.name}
      </h3>
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[#C084FC]">
        {member.role}
      </span>
      <div className="mt-[0.5rem] flex flex-col gap-[0.25rem]">
        <a
          href={`tel:${member.phone}`}
          className="text-[0.8125rem] font-semibold text-[#d8cee8] hover:text-white transition-colors flex items-center gap-[0.4rem]"
        >
          <svg className="w-[0.8rem] h-[0.8rem] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {member.phone}
        </a>
        <a
          href={`mailto:${member.email}`}
          className="text-[0.75rem] text-[#b9accd] hover:text-white transition-colors flex items-start gap-[0.4rem] break-words leading-tight"
        >
          <svg className="w-[0.8rem] h-[0.8rem] flex-shrink-0 mt-[0.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="min-w-0">{member.email}</span>
        </a>
      </div>
    </div>
  </motion.div>
);

export default function ContactUs() {
  const hexSize = 240; // Reduced slightly for tighter fit
  const gap = 8;

  const hexPositions = useMemo(() => {
    const w = hexSize + gap;
    const h = hexSize / 0.866 + gap;

    return [
      { x: -0.5 * w, y: -0.75 * h }, // 0: Top-Left
      { x: 0.5 * w, y: -0.75 * h }, // 1: Top-Right
      { x: w, y: 0 }, // 2: Right
      { x: 0.5 * w, y: 0.75 * h }, // 3: Bottom-Right
      { x: -0.5 * w, y: 0.75 * h }, // 4: Bottom-Left
      { x: -w, y: 0 }, // 5: Left
    ];
  }, []);

  return (
    <section
      id="contact"
      className="theme-section relative overflow-hidden py-[3rem] lg:py-[4rem]"
    >
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[50rem] w-[50rem] rounded-full bg-[#A855F7]/8 opacity-20 blur-[12.5rem] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[46.875rem] w-[46.875rem] rounded-full bg-[#818CF8]/8 opacity-20 blur-[11.25rem] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-[80rem] px-[1rem] sm:px-[1.5rem] lg:px-[2rem] font-heading">
        {/* DESKTOP HONEYCOMB - Shown only when screen is large enough (min-width: lg) */}
        <div className="hidden lg:block">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="relative flex flex-col items-center justify-center lg:h-[42.5rem]"
          >
            {/* CENTER HUB */}
            <a
              href="mailto:mazex@knurdz.org"
              className="lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 w-full max-w-[15rem] z-30 pointer-events-none"
            >
              <Hexagon isCenter>
                <div className="flex flex-col items-center">
                  <div className="mb-[1rem] flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20 shadow-lg">
                    <svg
                      className="w-[1.75rem] h-[1.75rem] text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-[1.25rem] sm:text-[1.5rem] font-black uppercase tracking-[0.3em] leading-tight text-white drop-shadow-md">
                    Contact <br /> Us
                  </h2>
                </div>
              </Hexagon>
            </a>

            {/* CONTACT HONEYCOMB CARDS */}
            {TEAM_MEMBERS.map((member, index) => {
              const posIndexMap = [0, 1, 2, 5, 4, 3];
              const posIndex = posIndexMap[index] ?? index;
              const pos = hexPositions[posIndex];
              return (
                <div
                  key={member.email}
                  className="w-full max-w-[15rem] lg:absolute lg:top-1/2 lg:left-1/2 pointer-events-none"
                  style={
                    {
                      "--tx": `${(pos.x) / 16}rem`,
                      "--ty": `${(pos.y) / 16}rem`,
                    } as any
                  }
                >
                  <div className="lg:[transform:translate(calc(-50%+var(--tx)),calc(-50%+var(--ty)))]">
                    <Hexagon custom={pos}>
                      <div className="flex flex-col items-center w-full">
                        <div className="relative mb-[0.75rem] h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full ring-2 ring-maze-border/40 transition-all duration-500 group-hover:ring-[#A855F7]/60 shadow-xl">
                          <ImageWithSkeleton
                            src={member.image}
                            alt={member.name}
                            fill
                            sizes="72px"
                            className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110"
                          />
                        </div>

                        <h3 className="mb-[0.125rem] text-[0.75rem] sm:text-[0.875rem] font-bold tracking-tight text-[#F8FAFC]">
                          {member.name}
                        </h3>

                        <span className="mb-[0.5rem] text-[0.5rem] sm:text-[0.5625rem] font-bold uppercase tracking-[0.16em] text-[#C084FC]">
                          {member.role}
                        </span>

                        <div className="flex flex-col items-center gap-[0.25rem]">
                          <a
                            href={`tel:${member.phone}`}
                            className="text-[0.75rem] sm:text-[0.875rem] font-semibold leading-tight text-[#d8cee8] hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/70 rounded px-[0.25rem] py-[0.125rem] transition-colors"
                          >
                            {member.phone}
                          </a>
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="text-[0.625rem] leading-tight text-[#b9accd] hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/70 rounded px-[0.25rem] py-[0.125rem] transition-colors break-all text-center max-w-[10.625rem]"
                            >
                              {member.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </Hexagon>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* MOBILE LAYOUT - Shown on small screens (max-width: lg) */}
        <div className="block lg:hidden">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col items-center gap-[2.5rem]"
          >
            {/* Mobile Header */}
            <div className="text-center">
              <h2 className="text-[2rem] font-black uppercase tracking-[0.2em] text-white">
                Contact Us
              </h2>
              <div className="mt-[0.5rem] h-[0.125rem] w-[4rem] mx-auto bg-gradient-to-r from-transparent via-[#A855F7] to-transparent" />
            </div>

            {/* Mobile Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[1rem] w-full max-w-[40rem]">
              {TEAM_MEMBERS.map((member) => (
                <MobileContactCard key={member.email} member={member} />
              ))}
            </div>

            {/* General Inquiry Link */}
            <a
              href="mailto:mazex@knurdz.org"
              className="theme-button-secondary inline-flex items-center gap-[0.75rem] px-[1.5rem] py-[1rem] rounded-[1rem] group"
            >
              <div className="p-[0.5rem] rounded-full bg-[#A855F7]/20 group-hover:bg-[#A855F7]/40 transition-colors">
                <svg className="w-[1rem] h-[1rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-bold tracking-widest uppercase text-xs">General Inquiries</span>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
