"use client";

import { motion } from "framer-motion";
import type { PublicSponsor } from "@/lib/sponsor-types";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

import ImageWithSkeleton from "./ImageWithSkeleton";

export default function Sponsorship({
  sponsors,
  sponsorOpeningsEnabled,
}: {
  sponsors: PublicSponsor[];
  sponsorOpeningsEnabled: boolean;
}) {
  return (
    <section
      id="sponsors"
      aria-label="Official Partners and Sponsors of MazeX 1.0"
      className="theme-section-alt relative overflow-hidden py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center sm:mb-14"
        >
          <h2 className="text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl lg:text-5xl">
            Official Partners
          </h2>
          {sponsors.length > 0 && (
            <p className="sr-only">
              MazeX 1.0 is proudly supported by: {sponsors.map((s) => s.title).join(", ")}.
            </p>
          )}
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-12 pt-4 sm:gap-16 md:items-end md:gap-20 lg:gap-28 md:pt-8"
        >
          {sponsors.map((partner, i) => (
            <motion.div
              key={partner.id}
              variants={itemVariants}
              className="group flex flex-col items-center"
            >
              {partner.websiteUrl ? (
                <a
                  href={partner.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit ${partner.title} website — Sponsor of MazeX 1.0`}
                  title={partner.title}
                  className="relative flex h-16 w-48 sm:h-20 sm:w-64 overflow-hidden items-center justify-center rounded-none bg-white p-1 sm:p-2 shadow-[0_0.5rem_1.875rem_rgba(0,0,0,0.12)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                >
                  <motion.div
                    animate={{ translateX: ["-150%", "150%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatDelay: 3.5,
                      ease: "easeInOut",
                      delay: i * 2,
                    }}
                    className="absolute inset-0 z-10 skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/80 to-transparent"
                  />

                  <ImageWithSkeleton
                    src={partner.imageSrc}
                    alt={`${partner.title} Logo`}
                    className="z-0 object-contain transition-transform duration-500 group-hover:scale-110"
                    containerClassName="absolute inset-0 z-0 !p-1 sm:!p-2"
                    fill
                    sizes="256px"
                  />
                </a>
              ) : (
                <div
                  className="relative flex h-16 w-48 sm:h-20 sm:w-64 overflow-hidden items-center justify-center rounded-none bg-white p-1 sm:p-2 shadow-[0_0.5rem_1.875rem_rgba(0,0,0,0.12)]"
                  title={partner.title}
                  aria-label={`${partner.title} — Sponsor of MazeX 1.0`}
                >
                  <motion.div
                    animate={{ translateX: ["-150%", "150%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatDelay: 3.5,
                      ease: "easeInOut",
                      delay: i * 2,
                    }}
                    className="absolute inset-0 z-10 skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/80 to-transparent"
                  />

                  <ImageWithSkeleton
                    src={partner.imageSrc}
                    alt={`${partner.title} Logo`}
                    className="z-0 object-contain"
                    containerClassName="absolute inset-0 z-0 !p-1 sm:!p-2"
                    fill
                    sizes="256px"
                  />
                </div>
              )}
              
              <div className="mt-8 flex flex-col items-center gap-1 sm:gap-2">
                <h3 className="text-sm font-semibold tracking-[0.25em] text-white sm:text-base">
                  {partner.title.toUpperCase()}
                </h3>
                
                {partner.websiteUrl ? (
                  <a
                    href={partner.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-2 text-sm font-medium tracking-wide text-[#9e8db3] transition-colors duration-300 hover:text-white"
                  >
                    View Site
                    <svg className="h-4 w-4 opacity-50 transition-opacity duration-300 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : null}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {sponsors.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto mt-12 max-w-2xl text-center"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-[#9e8db3]">
              Partners will be announced soon
            </p>
          </motion.div>
        ) : null}

        {sponsorOpeningsEnabled ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto mt-20 flex flex-col items-center px-4 text-center"
          >
            <h3 className="mb-8 text-xl font-medium text-[#e2e8f0] sm:text-2xl">
              Interested in partnering?{" "}
              <span className="bg-gradient-to-r from-[#A855F7] to-[#818CF8] bg-clip-text font-bold text-transparent">
                Let&apos;s talk.
              </span>
            </h3>

            <a
              href="mailto:mazex@knurdz.org"
              className="theme-button theme-button-register inline-flex items-center justify-center rounded-full px-7 py-3 font-bold"
            >
              Contact Us
            </a>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
