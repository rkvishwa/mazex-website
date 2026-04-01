"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  resolveCompetitionCta,
  type ResolvedCompetitionEvent,
} from "@/lib/site-event-types";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function calculateTimeLeft(targetDate: string, now: number): TimeLeft {
  const diff = new Date(targetDate).getTime() - now;

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

function CountdownGrid({ targetDate }: { targetDate: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeLeft = useMemo(() => calculateTimeLeft(targetDate, now), [targetDate, now]);
  const units = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hours" },
    { value: timeLeft.minutes, label: "Minutes" },
    { value: timeLeft.seconds, label: "Seconds" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
      {units.map((unit) => (
        <div key={unit.label} className="theme-card-soft p-4 text-center sm:p-6">
          <div className="mx-auto mb-3 h-1 w-14 rounded-full bg-gradient-to-r from-[#A855F7] to-[#818CF8]" />
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
  );
}

export default function RegisterCTA({
  competition,
}: {
  competition: ResolvedCompetitionEvent;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!competition.openAt && !competition.closeAt) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [competition.closeAt, competition.openAt]);

  const { ctaState: liveState, countdownTarget } = useMemo(
    () =>
      resolveCompetitionCta({
        enabled: competition.enabled,
        openAt: competition.openAt,
        closeAt: competition.closeAt,
        registerHref: competition.registerHref,
        now,
      }),
    [
      competition.closeAt,
      competition.enabled,
      competition.openAt,
      competition.registerHref,
      now,
    ],
  );
  const showCountdown = Boolean(countdownTarget);
  const pillText =
    liveState === "countdown"
      ? "Registration Opens In"
      : liveState === "open" && countdownTarget
        ? "Registration Closes In"
        : liveState === "temporarily-closed"
          ? "Registration Temporarily Closed"
        : "Competition Registration";
  const statusText =
    liveState === "open"
      ? "Registration Is Open"
      : liveState === "temporarily-closed"
        ? "Registration Is Temporarily Closed"
      : liveState === "closed"
        ? "Registrations Are Closed"
        : "Coming Soon";

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
              {pillText}
            </span>

            <div className="my-8 h-px w-24 bg-gradient-to-r from-transparent via-[#818CF8]/50 to-transparent" />

            <div className="w-full max-w-4xl">
              {showCountdown ? (
                <CountdownGrid targetDate={countdownTarget!} />
              ) : (
                <div className="py-4 text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-r from-[#F8FAFC] via-[#CBD5E1] to-[#818CF8] bg-clip-text font-[family-name:var(--font-space-grotesk)] text-2xl font-bold uppercase tracking-[0.3em] text-transparent drop-shadow-[0_0_15px_rgba(129,140,248,0.25)] sm:text-3xl md:text-4xl"
                  >
                    {statusText}
                  </motion.div>
                </div>
              )}
            </div>

            {competition.scheduleLabel ? (
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[#c9bedb]">
                {competition.scheduleLabel}
              </p>
            ) : null}

            {liveState === "open" && competition.registerHref ? (
              <a
                href={competition.registerHref}
                className="theme-button theme-button-register mt-8 inline-flex rounded-full px-8 py-3 text-sm font-medium"
              >
                Register Now
              </a>
            ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
