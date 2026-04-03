"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PAST_EVENTS } from "@/lib/constants";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import ImageWithSkeleton from "./ImageWithSkeleton";

export default function PastEvents() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(
    null,
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const mounted = typeof document !== "undefined";

  useEffect(() => {
    if (selectedEventIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedEventIndex]);

  const selectedEvent =
    selectedEventIndex !== null ? PAST_EVENTS[selectedEventIndex] : null;

  const goToSlide = useCallback((index: number) => {
    if (index < 0) index = PAST_EVENTS.length - 1;
    if (index >= PAST_EVENTS.length) index = 0;
    setActiveSlide(index);
  }, []);

  // Auto-advance carousel every 5s, pause on hover or when modal is open
  useEffect(() => {
    if (isCarouselHovered || selectedEventIndex !== null) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % PAST_EVENTS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isCarouselHovered, selectedEventIndex]);

  // Keyboard nav
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedEventIndex !== null) return;
      if (e.key === "ArrowLeft") goToSlide(activeSlide - 1);
      if (e.key === "ArrowRight") goToSlide(activeSlide + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSlide, goToSlide, selectedEventIndex]);

  const getSlideStyle = (index: number) => {
    const diff = index - activeSlide;

    if (diff === 0) {
      return {
        zIndex: 30,
        x: 0,
        scale: 1,
        rotateY: 0,
        opacity: 1,
        filter: "brightness(1)",
      };
    }

    if (diff === 1 || diff === -(PAST_EVENTS.length - 1)) {
      return {
        zIndex: 20,
        x: "35%",
        scale: 0.78,
        rotateY: -12,
        opacity: 0.7,
        filter: "brightness(0.55)",
      };
    }

    if (diff === -1 || diff === PAST_EVENTS.length - 1) {
      return {
        zIndex: 20,
        x: "-35%",
        scale: 0.78,
        rotateY: 12,
        opacity: 0.7,
        filter: "brightness(0.55)",
      };
    }

    return {
      zIndex: 10,
      x: diff > 0 ? "60%" : "-60%",
      scale: 0.6,
      rotateY: diff > 0 ? -20 : 20,
      opacity: 0,
      filter: "brightness(0.3)",
    };
  };

  return (
    <section
      id="past-events"
      className="theme-section relative py-24 sm:py-32 overflow-hidden"
    >
      <div className="absolute left-[4%] top-[12%] h-[300px] w-[300px] rounded-full bg-[#A855F7]/10 opacity-30 blur-[120px] pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl mb-16 text-center"
        >
          <span className="block text-[#F8FAFC]">Previous</span>
          <span className="block bg-gradient-to-r from-[#8a73a6] via-[#6b528f] to-[#5a4b73] bg-clip-text text-transparent">
            Events
          </span>
        </motion.h2>

        {/* Dynamic Event Title & Description Section */}
        <div className="relative mb-14 text-center px-4 h-[240px] sm:h-[180px] md:h-[160px] flex flex-col items-center justify-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center relative h-full w-full justify-start"
            >
              {/* Ghost Text */}
              <motion.span
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 0.06, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center text-[12vw] sm:text-[14vw] font-black uppercase tracking-tighter text-white/20 pointer-events-none select-none whitespace-nowrap z-0 overflow-visible"
              >
                {(() => {
                  const title = PAST_EVENTS[activeSlide].title.toLowerCase();
                  if (title.includes("naturenook")) return "Naturenook";
                  if (title.includes("robotics day")) return "Robotics";
                  if (title.includes("hackelite")) return "Hackelite";
                  return PAST_EVENTS[activeSlide].title;
                })()}
              </motion.span>

              {/* Main Dynamic Title */}
              <h3 className="text-2xl sm:text-3xl font-bold text-[#8a73a6] mb-4 tracking-wide relative z-10 drop-shadow-sm">
                {PAST_EVENTS[activeSlide].title}
              </h3>

              {/* Decorative Accent Path Line */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "40px" }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="h-[2px] bg-[#6b528f] mb-4 rounded-full"
              />

              {/* Terminal Style Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="max-w-xl text-sm sm:text-base text-gray-400/90 leading-relaxed font-mono"
              >
                {/* Minimalist 'Typewriter' effect simulation via simple fade & container slide */}
                <span className="text-[#6b528f] mr-2 opacity-50">{">"}</span>
                {PAST_EVENTS[activeSlide].description}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative mx-auto"
          style={{ perspective: "1200px" }}
        >
          {/* Carousel Container */}
          <div
            className="relative mx-auto h-[200px] sm:h-[300px] md:h-[380px] lg:h-[450px] max-w-3xl"
            onMouseEnter={() => setIsCarouselHovered(true)}
            onMouseLeave={() => setIsCarouselHovered(false)}
          >
            {PAST_EVENTS.map((event, i) => {
              const style = getSlideStyle(i);
              const isActive = i === activeSlide;

              return (
                <motion.div
                  key={i}
                  animate={{
                    x: style.x,
                    scale: style.scale,
                    rotateY: style.rotateY,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                  }}
                  transition={{
                    type: "tween",
                    duration: 1,
                    ease: "easeInOut",
                  }}
                  onClick={() => {
                    if (isActive) {
                      setSelectedEventIndex(i);
                      setActiveImageIndex(0);
                    } else {
                      goToSlide(i);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    if (isActive) {
                      setSelectedEventIndex(i);
                      setActiveImageIndex(0);
                    } else {
                      goToSlide(i);
                    }
                  }}
                  className="absolute inset-0 mx-auto cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={
                    isActive
                      ? `Open ${event.title} gallery with ${event.images.length} photos`
                      : `Bring ${event.title} into focus`
                  }
                  style={{
                    transformStyle: "preserve-3d",
                    filter: style.filter,
                  }}
                >
                  <div
                    className={`relative h-full w-full overflow-hidden rounded-2xl border transition-all duration-300 ${
                      isActive
                        ? "border-[#6b528f]/40 shadow-2xl shadow-purple-900/20"
                        : "border-white/5"
                    }`}
                  >
                    {/* Image */}
                    <ImageWithSkeleton
                      src={event.images[0]}
                      alt={event.title}
                      className="object-cover"
                      fill
                      sizes="(max-width: 768px) 80vw, 60vw"
                      draggable={false}
                    />

                    {/* Subtle gradient for depth, no text overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

                    {/* Clear gallery affordances for active event */}
                    {isActive && (
                      <>
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute left-4 top-4 z-10 rounded-full border border-white/30 bg-black/55 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-md"
                        >
                          {event.images.length} Photos
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="absolute bottom-4 right-4 z-10 rounded-md border border-white/15 bg-black/45 px-2 py-1 text-[11px] font-medium text-gray-100"
                        >
                          Tap image to open
                        </motion.div>
                      </>
                    )}

                    {/* Subtle shimmer overlay on sides */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-black/20" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Scrollbar & Dots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col items-center gap-5"
        >
          <p className="text-center text-xs sm:text-sm text-gray-400/90">
            Click the highlighted event image to open its photo gallery.
          </p>
          <div className="flex gap-3">
            {PAST_EVENTS.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === activeSlide
                    ? "h-3 w-8 bg-[#8a73a6] shadow-lg shadow-purple-500/30"
                    : "h-3 w-3 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Go to event ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Gallery Modal - Using Portal */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {selectedEvent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/98 p-0 sm:p-4 backdrop-blur-md overflow-y-auto no-scrollbar"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedEventIndex(null)}
                  className="fixed top-6 right-6 z-[10000] rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 backdrop-blur-sm border border-white/10"
                >
                  <X size={24} />
                </button>

                <div className="flex flex-col items-center w-full max-w-5xl py-4 sm:py-6">
                  {/* Info Header */}
                  <div className="mb-4 text-center px-4">
                    <motion.h3
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight"
                    >
                      {selectedEvent.title}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed text-gray-400 line-clamp-2"
                    >
                      {selectedEvent.description}
                    </motion.p>
                  </div>

                  {/* Main Image View */}
                  <div className="relative flex w-full items-center justify-center mb-6 gap-4 px-0 sm:px-10">
                    {/* Desktop Nav Arrows */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) =>
                          prev > 0 ? prev - 1 : selectedEvent.images.length - 1,
                        );
                      }}
                      className="hidden sm:flex absolute left-0 lg:-left-6 z-[10000] rounded-full bg-white/10 p-2.5 text-white transition-all hover:bg-white/20 hover:scale-110 border border-white/10"
                    >
                      <ChevronLeft size={28} />
                    </button>

                    <motion.div
                      key={activeImageIndex}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.45 }}
                      className="relative aspect-[3/2] w-full max-w-5xl max-h-[55vh] sm:max-h-[70vh] overflow-hidden rounded-none sm:rounded-xl shadow-2xl shadow-black/80 border-y border-white/10 sm:border"
                    >
                      <ImageWithSkeleton
                        src={selectedEvent.images[activeImageIndex]}
                        alt={`${selectedEvent.title} - ${activeImageIndex + 1}`}
                        className="object-cover"
                        fill
                        sizes="(max-width: 768px) 100vw, 80vw"
                      />
                    </motion.div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) =>
                          prev < selectedEvent.images.length - 1 ? prev + 1 : 0,
                        );
                      }}
                      className="hidden sm:flex absolute right-0 lg:-right-4 z-[10000] rounded-full bg-white/10 p-2.5 text-white transition-all hover:bg-white/20 hover:scale-110 border border-white/10"
                    >
                      <ChevronRight size={28} />
                    </button>
                  </div>

                  {/* Thumbnails Section */}
                  <div className="w-full flex flex-col items-center">
                    <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar px-2 max-w-full">
                      {selectedEvent.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative h-12 w-18 sm:h-16 sm:w-24 flex-shrink-0 overflow-hidden rounded-lg border transition-all duration-300 ${
                            activeImageIndex === idx
                              ? "border-[#8a73a6] scale-105 shadow-md shadow-purple-500/40 opacity-100"
                              : "border-white/10 opacity-50 hover:opacity-100"
                          }`}
                        >
                          <ImageWithSkeleton
                            src={img}
                            className="object-cover"
                            fill
                            sizes="100px"
                            alt=""
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Click outside to close (background only) */}
                <div
                  className="fixed inset-0 z-[-1] cursor-zoom-out"
                  onClick={() => setSelectedEventIndex(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </section>
  );
}
