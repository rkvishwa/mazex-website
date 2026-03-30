"use client";

import { motion } from "framer-motion";

export default function RegisterCTA() {
  return (
    <section
      id="register"
      className="theme-section-alt relative overflow-hidden py-24 sm:py-32"
    >
      <div
        className="absolute top-1/2 left-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(129, 140, 248, 0.025) 0%, transparent 42%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="theme-card px-6 py-10 sm:px-10 sm:py-12"
        >
          <h2 className="mb-4 text-4xl font-bold text-[#F8FAFC] sm:text-5xl lg:text-6xl">
            Ready to Build Your Micromouse?
          </h2>

          <div className="mt-12 flex flex-col items-center justify-center">
            <span className="inline-flex items-center rounded-full border border-[#303959] bg-[#0B1427]/85 px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.24em] text-[#c9bedb]">
              Registration Opens
            </span>
            
            <div className="my-8 h-px w-24 bg-gradient-to-r from-transparent via-[#818CF8]/50 to-transparent" />
            
            <div className="bg-gradient-to-r from-[#F8FAFC] via-[#CBD5E1] to-[#818CF8] bg-clip-text font-[family-name:var(--font-space-grotesk)] text-2xl font-bold uppercase tracking-[0.3em] text-transparent drop-shadow-[0_0_15px_rgba(129,140,248,0.25)] sm:text-3xl md:text-4xl">
              Coming Soon
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
