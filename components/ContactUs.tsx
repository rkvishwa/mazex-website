"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const TEAM_MEMBERS = [
  {
    name: "Chanuru Dewnitha",
    role: "Chair",
    phone: "0788119064",
    email: "chaniruranawaka@gmail.com",
    image: "/images/Chair_DP.jpeg",
  },
  {
    name: "Rashmika Wellappili",
    role: "Vice Chair",
    phone: "0706270500",
    email: "rashmikarw@gmail.com",
    image: "/images/Vice_Chair3_DP.jpeg",
  },
  {
    name: "Sarjana Shanmugarajah",
    role: "Vice Chair",
    phone: "0750744233",
    email: "sar03jana@gmail.com",
    image: "/images/Vice_Chair1_DP.jpeg",
  },
  {
    name: "Raneesha Fernando",
    role: "Vice Chair",
    phone: "0779811166",
    email: "raneesha0925@gmail.com",
    image: "/images/Vice_Chair2_DP.jpeg",
  },
  {
    name: "Sasindu Wellage",
    role: "Finance Committee Lead",
    phone: "0769389061",
    email: "wellagesasindu@gmail.com",
    image: "/images/Finance_committee_lead_DP.jpeg",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function ContactUs() {
  /* First row: 3 cards, Second row: 2 cards centered */
  const topRow = TEAM_MEMBERS.slice(0, 3);
  const bottomRow = TEAM_MEMBERS.slice(3);

  const renderCard = (member: (typeof TEAM_MEMBERS)[number]) => (
    <motion.div
      key={member.email}
      variants={cardVariants}
      className="group relative w-full"
    >
      {/* Glow border on hover */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[#2C7DA0]/40 to-[#61A5C2]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]" />

      <div className="relative flex flex-col items-center bg-[#0A1929]/80 backdrop-blur-sm border border-[#1B4965]/40 rounded-2xl px-6 py-10 transition-all duration-500 group-hover:border-[#2C7DA0]/50 group-hover:bg-[#0D2040]/90 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-[#2C7DA0]/10">
        {/* Profile image */}
        <div className="relative mb-6">
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-[#2C7DA0] to-[#61A5C2] opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-[3px]" />
          <div className="relative w-32 h-32 rounded-full overflow-hidden ring-[3px] ring-[#1B4965]/60 group-hover:ring-[#2C7DA0]/80 transition-all duration-500">
            <Image
              src={member.image}
              alt={member.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        </div>

        {/* Name */}
        <h3 className="text-[#EAF6FF] font-bold text-xl font-[family-name:var(--font-space-grotesk)] mb-2 text-center tracking-tight">
          {member.name}
        </h3>

        {/* Role badge */}
        <span className="inline-block bg-gradient-to-r from-[#2C7DA0]/20 to-[#61A5C2]/20 border border-[#2C7DA0]/30 text-[#61A5C2] text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
          {member.role}
        </span>

        {/* Thin separator */}
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#2C7DA0]/50 to-transparent mb-6" />

        {/* Phone */}
        <a
          href={`tel:${member.phone}`}
          className="text-[#A9D6E5] text-base font-medium tracking-wide hover:text-[#EAF6FF] transition-colors duration-200 mb-2"
        >
          {member.phone}
        </a>

        {/* Email */}
        <a
          href={`mailto:${member.email}`}
          className="text-[#61A5C2]/80 text-sm tracking-wide hover:text-[#EAF6FF] transition-colors duration-200"
        >
          {member.email}
        </a>
      </div>
    </motion.div>
  );

  return (
    <section
      id="contact"
      className="relative py-20 lg:py-28 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #061826 0%, #0A1F33 50%, #061826 100%)",
      }}
    >
      {/* Ambient glows */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#2C7DA0]/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-[#61A5C2]/6 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-[#2C7DA0]/10 border border-[#2C7DA0]/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#61A5C2] animate-pulse" />
            <span className="text-[#A9D6E5] text-sm font-medium tracking-wide uppercase">
              Get In Touch
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-[family-name:var(--font-space-grotesk)] mb-4">
            <span className="text-[#EAF6FF]">Contact </span>
            <span className="bg-gradient-to-r from-[#61A5C2] to-[#A9D6E5] bg-clip-text text-transparent">
              Us
            </span>
          </h2>
          <p className="text-[#A9D6E5]/70 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Have questions about MazeX 1.0? Reach out to our organizing
            committee.
          </p>
          <div className="mt-6 mx-auto w-24 h-1 rounded-full bg-gradient-to-r from-[#2C7DA0] to-[#61A5C2]" />
        </motion.div>

        {/* Top row: 3 cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8"
        >
          {topRow.map(renderCard)}
        </motion.div>

        {/* Bottom row: 2 cards centered */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-col sm:flex-row justify-center gap-6 lg:gap-8"
        >
          {bottomRow.map((member) => (
            <div
              key={member.email}
              className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1.33rem)]"
            >
              {renderCard(member)}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
