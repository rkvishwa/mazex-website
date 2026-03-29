"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { NAV_LINKS } from "@/lib/constants";

type NavTheme = "violet" | "blue";

const NAV_THEMES: Record<
  NavTheme,
  {
    shell: string;
    linkGroup: string;
    linkIdle: string;
    linkActive: string;
    menuButton: string;
    mobilePanel: string;
    mobileLink: string;
  }
> = {
  violet: {
    shell:
      "overflow-hidden border-b border-[#352947]/75 bg-transparent shadow-[inset_0_-1px_0_rgba(107,82,143,0.18)]",
    linkGroup: "border-[#352947] bg-[#0c0918]/88",
    linkIdle: "text-[#d7d0e6] hover:bg-[#181127] hover:text-[#F8FAFC]",
    linkActive: "bg-[#241837] text-[#F8FAFC] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    menuButton: "border-[#3b2a56] bg-[#0c0918]/92 text-[#F4F2FF]",
    mobilePanel:
      "border-[#3b2a56]/80 bg-[linear-gradient(180deg,rgba(10,6,20,0.96)_0%,rgba(5,4,14,0.94)_100%)] shadow-[0_20px_60px_rgba(22,8,40,0.46)]",
    mobileLink:
      "border-[#312544] bg-[#0c0918]/92 hover:border-[#6b528f] hover:bg-[#161026] text-[#d7d0e6] hover:text-[#F8FAFC]",
  },
  blue: {
    shell:
      "overflow-hidden border-b border-[#294864]/75 bg-transparent shadow-[inset_0_-1px_0_rgba(56,189,248,0.18)]",
    linkGroup: "border-[#21384e] bg-[#07131f]/88",
    linkIdle: "text-[#cfe2f3] hover:bg-[#102130] hover:text-[#F8FAFC]",
    linkActive: "bg-[#122537] text-[#F8FAFC] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    menuButton: "border-[#294864] bg-[#07131f]/92 text-[#EAF6FF]",
    mobilePanel:
      "border-[#294864]/80 bg-[linear-gradient(180deg,rgba(5,15,26,0.96)_0%,rgba(3,10,18,0.94)_100%)] shadow-[0_20px_60px_rgba(4,20,34,0.46)]",
    mobileLink:
      "border-[#21384e] bg-[#07131f]/92 hover:border-[#38BDF8] hover:bg-[#0d1b29] text-[#cfe2f3] hover:text-[#F8FAFC]",
  },
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [navTheme, setNavTheme] = useState<NavTheme>("violet");
  const [activeHref, setActiveHref] = useState("#hero");

  useEffect(() => {
    const sectionSelector = ".site-shell > section, .site-shell > footer";
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(sectionSelector),
    );

    if (!sections.length) {
      return;
    }

    const navTargets = new Set(NAV_LINKS.map((link) => link.href));

    const applySectionTheme = (currentSection: HTMLElement) => {
      setNavTheme(
        currentSection.classList.contains("theme-section-alt") ? "blue" : "violet",
      );

      const nextHref = currentSection.id ? `#${currentSection.id}` : "";
      setActiveHref(navTargets.has(nextHref) ? nextHref : "");
    };

    const updateFromViewport = () => {
      const navLine = 140;
      const currentSection =
        sections.find((section) => {
          const rect = section.getBoundingClientRect();
          return rect.top <= navLine && rect.bottom > navLine;
        }) ?? sections[0];

      applySectionTheme(currentSection);
    };

    const observer = new IntersectionObserver(
      () => {
        updateFromViewport();
      },
      {
        root: null,
        rootMargin: "-110px 0px -55% 0px",
        threshold: [0, 0.05, 0.2, 0.4, 0.6],
      },
    );

    sections.forEach((section) => observer.observe(section));
    updateFromViewport();
    window.addEventListener("scroll", updateFromViewport, { passive: true });
    window.addEventListener("resize", updateFromViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateFromViewport);
      window.removeEventListener("resize", updateFromViewport);
    };
  }, []);

  const theme = NAV_THEMES[navTheme];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div
        data-navbar-shell
        className="w-full"
      >
        <div
          className={`w-full backdrop-blur-2xl transition-[background-color,border-color] duration-500 ${theme.shell}`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-[80px] items-center justify-between">
              <a href="#" className="flex items-center hover:opacity-90 transition-opacity">
                <Image
                  src="/images/brand/logo-white.svg"
                  alt="MazeX Logo"
                  width={132}
                  height={74}
                  className="h-12 w-auto object-contain sm:h-14"
                  priority
                />
              </a>

              <div className="hidden items-center gap-4 md:flex">
                <div
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 transition-[background-color,border-color] duration-500 ${theme.linkGroup}`}
                >
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-300 ${
                        activeHref === link.href ? theme.linkActive : theme.linkIdle
                      }`}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <a
                  href="#register"
                  className="theme-button theme-button-register rounded-full px-5 py-2 text-sm font-semibold"
                >
                  Register Now
                </a>
              </div>

              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`rounded-full border p-2 transition-[background-color,border-color,color] duration-500 md:hidden ${theme.menuButton}`}
                aria-label="Toggle menu"
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`w-full overflow-hidden border-t transition-[background-color,border-color,box-shadow] duration-500 md:hidden ${theme.mobilePanel}`}
            >
              <div className="mx-auto max-w-7xl space-y-3 px-4 py-6 sm:px-6">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`block rounded-2xl border px-4 py-3 text-base font-medium transition-[background-color,border-color,color,box-shadow] duration-300 ${
                      activeHref === link.href
                        ? `${theme.mobileLink} ${theme.linkActive}`
                        : theme.mobileLink
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href="#register"
                  onClick={() => setIsOpen(false)}
                  className="theme-button theme-button-register mt-4 block rounded-full px-5 py-3 text-center font-semibold"
                >
                  Register Now
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
