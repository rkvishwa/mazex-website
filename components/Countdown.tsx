"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { REGISTRATION_OPEN_DATE, COMPETITION_DATE } from "@/lib/constants";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: Date, now: number): TimeLeft {
  const diff = targetDate.getTime() - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

interface CountdownProps {
  initialMode?: "registration" | "competition";
  showModeSwitch?: boolean;
  registrationMode?: "countdown" | "comingSoon";
}

export default function Countdown({
  initialMode = "competition",
  showModeSwitch = true,
  registrationMode = "countdown",
}: CountdownProps) {
  const [showCompetition, setShowCompetition] = useState(
    initialMode === "competition"
  );
  const targetDate = showCompetition ? COMPETITION_DATE : REGISTRATION_OPEN_DATE;
  const [now, setNow] = useState(() => Date.now());
  const timeLeft = calculateTimeLeft(targetDate, now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const units = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hours" },
    { value: timeLeft.minutes, label: "Minutes" },
    { value: timeLeft.seconds, label: "Seconds" },
  ];

  return (
    <div>
      {showModeSwitch ? (
        <div className="mb-8 flex justify-center">
          <div className="rounded-full border border-[#303959] bg-[#0B1427]/85 p-1.5 shadow-[0_12px_30px_rgba(2,6,23,0.25)]">
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setShowCompetition(true);
                  setNow(Date.now());
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 cursor-pointer ${
                  showCompetition
                    ? "theme-button text-[#F8FAFC]"
                    : "text-[#c9bedb] hover:text-[#F8FAFC]"
                }`}
              >
                Competition Day
              </button>
              <button
                onClick={() => {
                  setShowCompetition(false);
                  setNow(Date.now());
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 cursor-pointer ${
                  !showCompetition
                    ? "theme-button text-[#F8FAFC]"
                    : "text-[#c9bedb] hover:text-[#F8FAFC]"
                }`}
              >
                Registration Opens
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 flex justify-center">
          <span className="inline-flex rounded-full border border-[#303959] bg-[#0B1427]/85 px-6 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#c9bedb]">
            Registration Opens
          </span>
        </div>
      )}

      <div className="min-h-[260px] sm:min-h-[220px] flex flex-col justify-center">
        {showCompetition || registrationMode === "countdown" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
            {units.map((unit, i) => (
              <div key={i} className="theme-card-soft p-4 text-center sm:p-6">
                <div className="mb-3 h-1 w-14 rounded-full bg-gradient-to-r from-[#A855F7] to-[#818CF8] mx-auto" />
                <div
                  className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold tabular-nums text-[#F8FAFC] sm:text-5xl"
                  suppressHydrationWarning
                >
                  {String(unit.value).padStart(2, "0")}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.24em] text-[#c9bedb] sm:text-sm">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold uppercase tracking-[0.2em] text-[#c9bedb] sm:text-3xl md:text-4xl"
            >
              Coming Soon
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
