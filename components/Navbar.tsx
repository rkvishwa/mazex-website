"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";

const adminIconPath =
  "M12 14V16C8.68629 16 6 18.6863 6 22H4C4 17.5817 7.58172 14 12 14ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11ZM14.5946 18.8115C14.5327 18.5511 14.5 18.2794 14.5 18C14.5 17.7207 14.5327 17.449 14.5945 17.1886L13.6029 16.6161L14.6029 14.884L15.5952 15.4569C15.9883 15.0851 16.4676 14.8034 17 14.6449V13.5H19V14.6449C19.5324 14.8034 20.0116 15.0851 20.4047 15.4569L21.3971 14.8839L22.3972 16.616L21.4055 17.1885C21.4673 17.449 21.5 17.7207 21.5 18C21.5 18.2793 21.4673 18.551 21.4055 18.8114L22.3972 19.3839L21.3972 21.116L20.4048 20.543C20.0117 20.9149 19.5325 21.1966 19.0001 21.355V22.5H17.0001V21.3551C16.4677 21.1967 15.9884 20.915 15.5953 20.5431L14.603 21.1161L13.6029 19.384L14.5946 18.8115ZM18 19.5C18.8284 19.5 19.5 18.8284 19.5 18C19.5 17.1716 18.8284 16.5 18 16.5C17.1716 16.5 16.5 17.1716 16.5 18C16.5 18.8284 17.1716 19.5 18 19.5Z";

type NavTheme = "violet" | "blue";

const HOME_PATH = "/";

function getHomeSectionHref(hash: string) {
  if (!hash || hash === "#") {
    return HOME_PATH;
  }

  return `${HOME_PATH}${hash}`;
}

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
      "overflow-hidden border-b border-[#352947]/75 bg-transparent shadow-[inset_0_-0.0625rem_0_rgba(107,82,143,0.18)]",
    linkGroup: "border-[#352947] bg-[#0c0918]/88",
    linkIdle: "text-[#d7d0e6] hover:bg-[#181127] hover:text-[#F8FAFC]",
    linkActive: "bg-[#241837] text-[#F8FAFC] shadow-[inset_0_0.0625rem_0_rgba(255,255,255,0.04)]",
    menuButton: "border-[#3b2a56] bg-[#0c0918]/92 text-[#F4F2FF]",
    mobilePanel:
      "border-[#3b2a56]/80 bg-[linear-gradient(180deg,rgba(10,6,20,0.96)_0%,rgba(5,4,14,0.94)_100%)] shadow-[0_1.25rem_3.75rem_rgba(22,8,40,0.46)]",
    mobileLink:
      "border-[#312544] bg-[#0c0918]/92 hover:border-[#6b528f] hover:bg-[#161026] text-[#d7d0e6] hover:text-[#F8FAFC]",
  },
  blue: {
    shell:
      "overflow-hidden border-b border-[#294864]/75 bg-transparent shadow-[inset_0_-0.0625rem_0_rgba(56,189,248,0.18)]",
    linkGroup: "border-[#21384e] bg-[#07131f]/88",
    linkIdle: "text-[#cfe2f3] hover:bg-[#102130] hover:text-[#F8FAFC]",
    linkActive: "bg-[#122537] text-[#F8FAFC] shadow-[inset_0_0.0625rem_0_rgba(255,255,255,0.04)]",
    menuButton: "border-[#294864] bg-[#07131f]/92 text-[#EAF6FF]",
    mobilePanel:
      "border-[#294864]/80 bg-[linear-gradient(180deg,rgba(5,15,26,0.96)_0%,rgba(3,10,18,0.94)_100%)] shadow-[0_1.25rem_3.75rem_rgba(4,20,34,0.46)]",
    mobileLink:
      "border-[#21384e] bg-[#07131f]/92 hover:border-[#38BDF8] hover:bg-[#0d1b29] text-[#cfe2f3] hover:text-[#F8FAFC]",
  },
};

export default function Navbar({
  registerHref = getHomeSectionHref("#register"),
}: {
  registerHref?: string;
}) {
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
  const adminButtonClassName =
    "inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/16 bg-white/6 text-white shadow-[0_0.75rem_2rem_rgba(2,4,12,0.34)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#A855F7]/50 hover:bg-[#A855F7]/10";

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
            <div className="flex h-[5rem] items-center justify-between">
              <a
                href={HOME_PATH}
                className="flex items-center transition-opacity hover:opacity-90"
              >
                <Image
                  src="/images/brand/logo-white.svg"
                  alt="MazeX 1.0 - Micromouse Robotics Competition by IEEE RAS & WIE, University of Moratuwa"
                  width={156}
                  height={88}
                  className="h-[3.5rem] w-auto object-contain sm:h-[3.5rem] lg:h-[4rem]"
                  priority
                />
              </a>

              <div className="hidden items-center gap-2 lg:gap-4 md:flex">
                <div
                  className={`flex items-center gap-1 lg:gap-2 rounded-full border px-2 py-1.5 lg:px-3 lg:py-2 transition-[background-color,border-color] duration-500 ${theme.linkGroup}`}
                >
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={getHomeSectionHref(link.href)}
                      className={`rounded-full px-3 py-1.5 lg:px-4 lg:py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-300 ${
                        activeHref === link.href ? theme.linkActive : theme.linkIdle
                      }`}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <a
                  href={registerHref}
                  className="theme-button theme-button-register whitespace-nowrap rounded-full px-4 py-2 lg:px-6 lg:py-2.5 text-sm font-medium"
                >
                  Register Now
                </a>
                <Link
                  href="/login"
                  aria-label="Admin login"
                  className={adminButtonClassName}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d={adminIconPath} />
                  </svg>
                </Link>
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
                    href={getHomeSectionHref(link.href)}
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
                  href={registerHref}
                  onClick={() => setIsOpen(false)}
                  className="theme-button theme-button-register mt-4 block rounded-2xl px-3.5 py-2 text-center font-medium"
                >
                  Register Now
                </a>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  aria-label="Admin login"
                  className={`${adminButtonClassName} mt-3`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d={adminIconPath} />
                  </svg>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
