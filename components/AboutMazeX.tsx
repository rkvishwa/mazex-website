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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <span className="theme-kicker">Mission Brief</span>
        </motion.div>

        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="mb-6 text-3xl font-bold leading-tight text-[#F8FAFC] sm:text-4xl lg:text-5xl">
              What is MazeX 1.0?
            </h2>
            <p className="theme-copy mb-8 text-lg">
              MazeX 1.0 is an intra-university Micromouse Robotics Competition. It is
              a technical initiative designed to push the boundaries of robotics
              through hands-on engineering.
            </p>

            <div className="maze-card group cursor-default p-6 sm:p-8">
              <div className="maze-card-scan" />
              <span className="theme-kicker mb-4 !px-3 !py-1 text-[0.625rem]">
                Why It Matters
              </span>
              <p className="theme-copy text-sm italic sm:text-base">
                A preliminary workshop will introduce micromouse concepts, maze
                solving techniques, and robot design giving all participants
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
                className="maze-card group cursor-default p-5 transition-all duration-300 sm:p-6"
              >
                <div 
                  className="maze-card-scan" 
                  style={{ animationDelay: `${i * 0.8}s` }}
                />
                
                <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[#352F55] bg-[#0d0914] text-3xl transition-all duration-300 group-hover:border-[#A855F7]/40 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                  <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-[#A855F7]/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                    {feature.icon}
                  </span>
                </div>

                <div className="relative">
                  <div className="mb-3 h-px w-12 bg-gradient-to-r from-[#A855F7] to-transparent transition-all duration-500 group-hover:w-full" />
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-[#94a3b8] transition-colors group-hover:text-[#F8FAFC]">
                    Feature_{String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-sm font-semibold leading-relaxed text-[#EAF6FF] transition-colors group-hover:text-white">
                    {feature.label}
                  </h3>
                </div>

                <div className="absolute -bottom-4 -right-4 h-12 w-12 border-b-2 border-r-2 border-[#A855F7]/5 transition-all duration-500 group-hover:border-[#A855F7]/20" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
