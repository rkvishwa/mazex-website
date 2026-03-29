"use client";

import { motion } from "framer-motion";
import Countdown from "./Countdown";

export default function RegisterCTA() {
  return (
    <section
      id="register"
      className="theme-section relative overflow-hidden py-24 sm:py-32"
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

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-10"
          >
            <Countdown registrationMode="comingSoon" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
