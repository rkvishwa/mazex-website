"use client";

import { motion, useScroll, useTransform} from "framer-motion";
import { useRef } from "react";
import { WORKSHOP_EVENTS } from "@/lib/constants";

// Small top-down neon micromouse robot SVG component
const MicromouseRobot = () => (
  <svg
    width="40"
    height="28"
    viewBox="0 0 48 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]"
  >
    {/* Outer purple glow emitted by the robot */}
    <ellipse cx="24" cy="16" rx="16" ry="12" fill="#A855F7" opacity="0.3" filter="blur(4px)" />
    
    {/* Chassis */}
    <rect x="8" y="6" width="28" height="20" rx="3" fill="#0A1122" stroke="#818CF8" strokeWidth="1.5" />
    
    {/* Drive Wheels (Top & Bottom) */}
    <rect x="12" y="2" width="12" height="6" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
    <rect x="12" y="24" width="12" height="6" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
    
    {/* Front Sensors (IR beams pointing right) */}
    <path d="M 38 10 L 44 6 M 38 22 L 44 26 M 40 16 L 46 16" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
    
    {/* Microcontroller Brain */}
    <rect x="18" y="10" width="10" height="12" rx="2" fill="#1C1635" stroke="#A855F7" strokeWidth="1.5" />
    
    {/* Running Lights & CPU indicator */}
    <circle cx="23" cy="16" r="2" fill="#F8FAFC" className="animate-pulse" />
    <circle cx="32" cy="10" r="1.5" fill="#38BDF8" />
    <circle cx="32" cy="22" r="1.5" fill="#38BDF8" />
  </svg>
);

// Helper for the Card content so it's easily reused in both layouts
const WorkshopCardContent = ({ event }: { event: (typeof WORKSHOP_EVENTS)[0] }) => (
  <div className="w-full bg-[#0A1122]/95 backdrop-blur-[24px] border border-[#1E293B] rounded-[14px] p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.6)] group hover:border-[#334155] transition-colors duration-300 z-30 overflow-hidden relative">
    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[#A855F7] to-[#818cf8]/10" />
    <div className="absolute top-0 left-0 bottom-0 w-[1.5px] bg-gradient-to-b from-[#A855F7] to-[#818cf8]/10" />

    <div className="mb-3 sm:mb-4 inline-flex items-center gap-2 bg-[#1C1635] border border-[#3E2570] rounded-md px-2.5 py-1.5 shadow-sm">
      <svg
        className="w-3.5 h-3.5 text-[#B388EB]"
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
      <span className="text-[#B388EB] text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">
        {event.date}
      </span>
    </div>

    <h3 className="font-bold mb-2 leading-snug font-[family-name:var(--font-space-grotesk)] transition-all duration-300">
      <span className="block text-[#C084FC] text-[12px] sm:text-[13px] uppercase tracking-wider mb-1">
        Workshop {event.number}
      </span>
      <span className="block text-[#F8FAFC] text-[16px] sm:text-[18px] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#F8FAFC] group-hover:to-[#A855F7] transition-all duration-300">
        {event.title}
      </span>
    </h3>

    <p className="text-[#94A3B8] text-[12px] sm:text-[13px] leading-relaxed">
      {event.description}
    </p>
  </div>
);

// Helper for the Central Pin
const WorkshopPinMarker = () => (
  <div className="relative flex items-center justify-center">
    <div className="absolute -inset-3 bg-[#A855F7]/25 rounded-full blur-md animate-pulse pointer-events-none" />
    <div className="w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] rounded-full bg-[#1C1635] shadow-[0_0_15px_rgba(168,85,247,0.5)] border-[2.5px] border-[#A855F7] flex items-center justify-center box-border pointer-events-auto">
      <div className="w-[10px] h-[10px] bg-[#E2E8F0] rounded-full" />
    </div>
  </div>
);

export default function WorkshopTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Framer motion scroll tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const pathProgress = useTransform(scrollYProgress, [0, 0.9], ["0%", "100%"]);

  return (
    <section
      id="workshops"
      className="relative py-24 sm:py-32 overflow-hidden bg-[#070E1A]"
      ref={containerRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-8 md:mb-16 text-center md:text-left md:ml-4"
        >
          <span className="inline-block text-[#B388EB] font-bold text-xs tracking-[0.3em] uppercase mb-3">
            Workshop Series
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold uppercase leading-[1.05] tracking-tight text-[#F8FAFC]">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#818CF8] to-[#C084FC]">
              Workshop
            </span>
            <span className="block">Timeline</span>
          </h2>
        </motion.div>

        {/* ─── DESKTOP (Horizontal Layout) ─── */}
        <div className="hidden lg:block relative w-full h-[600px] mt-12 mx-auto">
          {/* Horizontal Road Structure */}
          <div className="absolute top-1/2 left-4 right-4 h-[24px] -translate-y-1/2 bg-[#0A1224] rounded-full border-y-[1.5px] border-[#A855F7]/30 shadow-[0_0_20px_rgba(168,85,247,0.25)] overflow-hidden">
            {/* Faint static dashed line */}
            <div 
               className="absolute top-[10px] left-0 right-0 h-[2px] opacity-20 border-t-2 border-dashed border-[#A855F7]"
            />
            {/* Animated bright neon center line */}
            <motion.div
              className="absolute top-[10px] left-0 h-[2.5px] w-full bg-gradient-to-r from-[#A855F7] via-[#F8FAFC] to-[#818CF8]"
              style={{ scaleX: pathProgress, transformOrigin: "left" }}
            />
          </div>

          {/* Continuously driving Micromouse Robot */}
          <motion.div
            animate={{ left: ["-10%", "110%"] }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]"
          >
            <MicromouseRobot />
          </motion.div>

          {/* Grid Layout for Workshop Cards guarantees NO horizontal overflow/scrollbars */}
          <div className="absolute inset-0 grid grid-cols-4 gap-4 px-4 w-full">
            {WORKSHOP_EVENTS.map((event, index) => {
              const isTop = index % 2 === 0;
              return (
                <div key={event.number} className="relative w-full h-full flex flex-col justify-center items-center">
                  
                  {/* Central Pin */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.15 + 0.2 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
                  >
                    <WorkshopPinMarker />
                  </motion.div>

                  {/* Vertical Dashed Connector Line */}
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.15 + 0.4 }}
                    style={{ transformOrigin: isTop ? "bottom" : "top" }}
                    className={`absolute left-1/2 -translate-x-1/2 w-[2px] border-l-2 border-dashed border-[#A855F7] opacity-60 h-[40px] z-10 ${
                      isTop ? "bottom-[calc(50%+16px)]" : "top-[calc(50%+16px)]"
                    }`}
                  />

                  {/* Card Wrapper offset top/bottom */}
                  <motion.div
                    initial={{ opacity: 0, y: isTop ? 40 : -40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.15 + 0.5 }}
                    className={`absolute w-[100%] min-w-[280px] max-w-[340px] z-20 ${
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

        {/* ─── MOBILE/TABLET (Vertical Layout) ─── */}
        <div className="lg:hidden relative w-full mt-10 md:mt-16 pb-8 px-2 sm:px-4">
          
          {/* Vertical Road Structure */}
          <div className="absolute left-[36px] sm:left-[44px] top-0 bottom-0 w-[24px] -translate-x-1/2 bg-[#0A1224] rounded-full border-x-[1.5px] border-[#A855F7]/30 shadow-[0_0_20px_rgba(168,85,247,0.25)] overflow-hidden">
            {/* Faint static dashed line centered horizontally */}
            <div className="absolute top-0 bottom-0 left-[10.5px] w-[2px] opacity-20 border-l-2 border-dashed border-[#A855F7]" />
            
            {/* Animated bright neon center line tracing top to bottom */}
            <motion.div
              className="absolute top-0 left-[10.5px] h-full w-[3px] bg-gradient-to-b from-[#A855F7] via-[#F8FAFC] to-[#818CF8]"
              style={{ scaleY: pathProgress, transformOrigin: "top" }}
              initial={{ scaleY: 0 }}
            />
            
            {/* Vertical Micromouse Robot Driving Downward */}
            <motion.div
              animate={{ top: ["-10%", "110%"] }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute left-[12px] -translate-x-1/2 z-40 pointer-events-none drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]"
            >
              <div className="rotate-90">
                <MicromouseRobot />
              </div>
            </motion.div>
          </div>

          {/* Workshop Cards mapped identically into a flex column */}
          <div className="relative z-10 flex flex-col gap-12 sm:gap-16 pt-8 pb-8">
            {WORKSHOP_EVENTS.map((event, index) => (
              <div key={event.number} className="relative z-10 pl-[80px] sm:pl-[100px] pr-2">
                
                {/* Pin on the left road */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.1 }}
                  className="absolute left-[36px] sm:left-[44px] -translate-x-1/2 top-1/2 -translate-y-1/2 z-30"
                >
                  <WorkshopPinMarker />
                </motion.div>

                {/* Horizontal Dashed Connector */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                  className="absolute left-[54px] sm:left-[62px] top-1/2 -translate-y-1/2 w-[24px] sm:w-[32px] border-t-2 border-dashed border-[#A855F7] opacity-60 origin-left -z-10"
                />

                {/* Card Wrapper */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                  className="w-full relative"
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
