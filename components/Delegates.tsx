"use client";

import { motion } from "framer-motion";

export default function Delegates() {
  return (
    <section id="delegates" className="theme-section relative pt-24 pb-32 sm:pt-32 sm:pb-40">
      <div className="absolute top-[10%] right-[-8%] h-[420px] w-[420px] rounded-full bg-[#A855F7]/10 opacity-40 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[8%] left-[-8%] h-[360px] w-[360px] rounded-full bg-[#818CF8]/10 opacity-40 blur-[130px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-center text-3xl font-bold text-[#F8FAFC] sm:text-4xl lg:text-5xl"
        >
          Delegate Booklet
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="theme-copy mx-auto mb-16 max-w-3xl text-center text-lg sm:text-xl"
        >
          Everything you need to know about MazeX 1.0 in one place. Our
          comprehensive delegate booklet covers the event schedule, competition
          rules, venue logistics, and technical resources.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="theme-card p-8 sm:p-12"
        >
          <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row">
            <div className="flex-shrink-0">
              <div className="flex h-28 w-24 flex-col items-center justify-center rounded-[1.5rem] border border-[#2D374F] bg-[#111A31]/90 shadow-[0_0_30px_rgba(168,85,247,0.12)] sm:h-32 sm:w-28">
                <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 h-10 w-10 text-[#C084FC] sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#c9bedb] sm:text-xs">
                  PDF
                </span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="mb-3 text-xl font-bold text-[#F8FAFC] sm:text-2xl">
                Download the Official Delegate Booklet
              </h3>
              <p className="max-w-xl text-sm leading-relaxed text-[#9e8db3] sm:text-base">
                Get your hands on the complete guide: event schedules,
                competition rules, venue navigation, and all the technical
                resources you&apos;ll need. Available as a convenient PDF for
                offline access.
              </p>
            </div>

            <div className="flex-shrink-0">
              <a
                href="/resources/delegate-booklet"
                className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-bold text-[#3B0764] shadow-[0_12px_32px_rgba(255,255,255,0.18)] transition-all duration-300 hover:scale-[1.03] hover:bg-[#F8F6FF] hover:shadow-[0_18px_48px_rgba(255,255,255,0.25)] active:scale-[0.98]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Booklet
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
