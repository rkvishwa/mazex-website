"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { WORKSHOP_EVENTS } from "@/lib/constants";

const MicromouseRobot = () => (
  <svg
    width="40"
    height="28"
    viewBox="0 0 48 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-[0_0_12px_rgba(107,82,143,0.4)]"
  >
    <ellipse cx="24" cy="16" rx="16" ry="12" fill="#6B528F" opacity="0.18" filter="blur(4px)" />
    <rect x="8" y="6" width="28" height="20" rx="3" fill="#0e0a14" stroke="#7A6A96" strokeWidth="1.5" />
    <rect x="12" y="2" width="12" height="6" rx="2" fill="#1a1624" stroke="#403357" strokeWidth="1.5" />
    <rect x="12" y="24" width="12" height="6" rx="2" fill="#1a1624" stroke="#403357" strokeWidth="1.5" />
    <path d="M 38 10 L 44 6 M 38 22 L 44 26 M 40 16 L 46 16" stroke="#5a4b73" strokeWidth="2" strokeLinecap="round" />
    <rect x="18" y="10" width="10" height="12" rx="2" fill="#1C1635" stroke="#8A73A6" strokeWidth="1.5" />
    <circle cx="23" cy="16" r="2" fill="#F8FAFC" className="animate-pulse" />
    <circle cx="32" cy="10" r="1.5" fill="#5a4b73" />
    <circle cx="32" cy="22" r="1.5" fill="#5a4b73" />
  </svg>
);

const WorkshopCardContent = ({ event }: { event: (typeof WORKSHOP_EVENTS)[0] }) => (
  <div className="relative z-30 w-full overflow-hidden rounded-[18px] border border-[#2f2540] bg-[#0e0a14]/95 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-[24px] transition-colors duration-300 group hover:border-[#3b3150] sm:p-6">
    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[#8A73A6] via-[#6B528F] to-transparent" />
    <div className="absolute top-0 left-0 bottom-0 w-[1.5px] bg-gradient-to-b from-[#8A73A6] via-[#6B528F] to-transparent" />

    <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#403357] bg-[#1C1635] px-2.5 py-1.5 shadow-sm sm:mb-4">
      <svg
        className="h-3.5 w-3.5 text-[#8A73A6]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span className="text-[9px] font-bold tracking-widest text-[#8A73A6] uppercase sm:text-[10px]">
        {event.date}
      </span>
    </div>

    <h3 className="mb-2 font-bold leading-snug transition-all duration-300">
      <span className="mb-1 block text-[12px] uppercase tracking-wider text-[#8A73A6] sm:text-[13px]">
        Workshop {event.number}
      </span>
      <span className="block text-[16px] text-[#F8FAFC] transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-[#F8FAFC] group-hover:to-[#8A73A6] group-hover:bg-clip-text group-hover:text-transparent sm:text-[18px]">
        {event.title}
      </span>
    </h3>

    <p className="text-[12px] leading-relaxed text-[#9e8db3] sm:text-[13px]">
      {event.description}
    </p>
  </div>
);

const WorkshopPinMarker = () => (
  <div className="relative flex items-center justify-center">
    <div className="pointer-events-none absolute -inset-3 rounded-full bg-[#6B528F]/20 blur-md animate-pulse" />
    <div className="pointer-events-auto box-border flex h-[32px] w-[32px] items-center justify-center rounded-full border-[2.5px] border-[#8A73A6] bg-[#1C1635] shadow-[0_0_15px_rgba(107,82,143,0.35)] sm:h-[36px] sm:w-[36px]">
      <div className="h-[10px] w-[10px] rounded-full bg-[#E2E8F0]" />
    </div>
  </div>
);

export default function WorkshopTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });
  const pathProgress = useTransform(scrollYProgress, [0, 0.9], ["0%", "100%"]);

  return (
    <section
      id="timeline"
      className="theme-section-alt relative overflow-hidden py-24 sm:py-32"
      ref={containerRef}
    >
      <div className="pointer-events-none absolute left-[-5%] top-[10%] h-[340px] w-[340px] rounded-full bg-[#6B528F]/10 opacity-35 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-4%] bottom-[12%] h-[340px] w-[340px] rounded-full bg-[#7A6A96]/10 opacity-35 blur-[120px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6B528F]/45 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-8 text-center md:mb-16 md:text-left md:ml-4"
        >
          <span className="theme-kicker mb-4">Workshop Series</span>
          <h2 className="text-4xl font-bold uppercase leading-[1.05] tracking-tight text-[#F8FAFC] sm:text-5xl lg:text-7xl">
            <span className="block bg-gradient-to-r from-[#7A6A96] to-[#8A73A6] bg-clip-text text-transparent">
              Workshop
            </span>
            <span className="block">Timeline</span>
          </h2>
        </motion.div>

        <div className="hidden lg:block relative w-full h-[600px] mt-12 mx-auto">
          <div className="absolute top-1/2 left-4 right-4 h-[24px] -translate-y-1/2 overflow-hidden rounded-full border-y-[1.5px] border-[#6B528F]/25 bg-[#0A1224] shadow-[0_0_18px_rgba(107,82,143,0.18)]">
            <div className="absolute top-[10px] left-0 right-0 h-[2px] border-t-2 border-dashed border-[#6B528F] opacity-20" />
            <motion.div
              className="absolute top-[10px] left-0 h-[2.5px] w-full bg-gradient-to-r from-[#6B528F] via-[#D8DEE9] to-[#7A6A96]"
              style={{ scaleX: pathProgress, transformOrigin: "left" }}
            />
          </div>

          <motion.div
            animate={{ left: ["-10%", "110%"] }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 pointer-events-none drop-shadow-[0_0_12px_rgba(107,82,143,0.4)]"
          >
            <MicromouseRobot />
          </motion.div>

          <div className="absolute inset-0 grid grid-cols-4 gap-4 px-4 w-full">
            {WORKSHOP_EVENTS.map((event, index) => {
              const isTop = index % 2 === 0;

              return (
                <div key={event.number} className="relative flex h-full w-full flex-col items-center justify-center">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.15 + 0.2 }}
                    className="absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
                  >
                    <WorkshopPinMarker />
                  </motion.div>

                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.15 + 0.4 }}
                    style={{ transformOrigin: isTop ? "bottom" : "top" }}
                    className={`absolute left-1/2 z-10 h-[40px] w-[2px] -translate-x-1/2 border-l-2 border-dashed border-[#6B528F] opacity-60 ${
                      isTop ? "bottom-[calc(50%+16px)]" : "top-[calc(50%+16px)]"
                    }`}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: isTop ? 40 : -40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.15 + 0.5 }}
                    className={`absolute z-20 w-[100%] min-w-[280px] max-w-[340px] ${
                      isTop ? "bottom-[calc(50%+65px)]" : "top-[calc(50%+65px)]"
                    }`}
                  >
                    <WorkshopCardContent event={event} />
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mt-10 w-full px-2 pb-8 sm:px-4 md:mt-16 lg:hidden">
          <div className="absolute top-0 bottom-0 left-[36px] w-[24px] -translate-x-1/2 overflow-hidden rounded-full border-x-[1.5px] border-[#6B528F]/25 bg-[#0A1224] shadow-[0_0_18px_rgba(107,82,143,0.18)] sm:left-[44px]">
            <div className="absolute top-0 bottom-0 left-[10.5px] w-[2px] border-l-2 border-dashed border-[#6B528F] opacity-20" />

            <motion.div
              className="absolute top-0 left-[10.5px] h-full w-[3px] bg-gradient-to-b from-[#6B528F] via-[#D8DEE9] to-[#7A6A96]"
              style={{ scaleY: pathProgress, transformOrigin: "top" }}
              initial={{ scaleY: 0 }}
            />

            <motion.div
              animate={{ top: ["-10%", "110%"] }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute left-[12px] z-40 -translate-x-1/2 pointer-events-none drop-shadow-[0_0_12px_rgba(107,82,143,0.4)]"
            >
              <div className="rotate-90">
                <MicromouseRobot />
              </div>
            </motion.div>
          </div>

          <div className="relative z-10 flex flex-col gap-12 pt-8 pb-8 sm:gap-16">
            {WORKSHOP_EVENTS.map((event, index) => (
              <div key={event.number} className="relative z-10 pr-2 pl-[80px] sm:pl-[100px]">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.1 }}
                  className="absolute left-[36px] top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 sm:left-[44px]"
                >
                  <WorkshopPinMarker />
                </motion.div>

                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                  className="absolute left-[54px] top-1/2 z-[-1] w-[24px] origin-left -translate-y-1/2 border-t-2 border-dashed border-[#6B528F] opacity-60 sm:left-[62px] sm:w-[32px]"
                />

                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                  className="relative w-full"
                >
                  <WorkshopCardContent event={event} />
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
