"use client";

import { motion } from "framer-motion";
import { ABOUT_FEATURES } from "@/lib/constants";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AboutMazeX() {
  return (
    <section id="about" className="theme-section-alt relative py-24 sm:py-32">
      <div className="absolute left-[-10%] top-10 h-[23.75rem] w-[23.75rem] rounded-full bg-[#A855F7]/10 opacity-40 blur-[8.125rem] pointer-events-none" />
      <div className="absolute right-[-8%] bottom-0 h-[20rem] w-[20rem] rounded-full bg-[#818CF8]/10 opacity-40 blur-[7.5rem] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="theme-kicker mb-5">Mission Brief</span>
            <h2 className="mb-6 text-3xl font-bold leading-tight text-[#F8FAFC] sm:text-4xl lg:text-5xl">
              What is MazeX 1.0?
            </h2>
            <p className="theme-copy mb-8 text-lg">
              MazeX 1.0 is an intra-university Micromouse Robotics Competition. It is
              a technical initiative designed to push the boundaries of robotics
              through hands-on engineering.
            </p>

            <div className="theme-card p-6 sm:p-8">
              <div className="theme-chip mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.28em]">
                Why It Matters
              </div>
              <p className="theme-copy text-sm italic sm:text-base">
                A preliminary workshop will introduce micromouse concepts, maze
                solving techniques, and robot design â€” giving all participants
                practical experience in robotics, embedded systems, and algorithm
                development.
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="hidden lg:grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {ABOUT_FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="theme-card-soft cursor-default p-5 transition-all duration-300 hover:-translate-y-1 sm:p-6"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#352F55] bg-[#1C1635] text-3xl shadow-[0_0_1.125rem_rgba(168,85,247,0.18)]">
                  {feature.icon}
                </div>
                <div className="mb-3 h-px w-full bg-gradient-to-r from-[#A855F7]/70 via-[#818CF8]/30 to-transparent" />
                <p className="text-sm font-medium leading-relaxed text-[#EAF6FF]">
                  {feature.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
