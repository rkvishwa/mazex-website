"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";

const SOCIAL_LINKS = [
  {
    icon: FaFacebookF,
    label: "Facebook",
    href: "https://tinyurl.com/32peyx86",
  },
  {
    icon: FaYoutube,
    label: "YouTube",
    href: "https://www.youtube.com/@IEEEUOMSB",
  },
  {
    icon: FaInstagram,
    label: "Instagram",
    href: "https://tinyurl.com/mvuzewvh",
  },
  {
    icon: FaWhatsapp,
    label: "WhatsApp",
    href: "https://tinyurl.com/37at6ae4",
  },
];

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
  { label: "Timeline", href: "/#timeline" },
  { label: "Register", href: "/#register" },
];

const VALUE_POINTS = [
  "Hands-on Micromouse design and control sessions",
  "Guidance from mentors across each workshop phase",
  "Competition-ready roadmap from basics to race day",
];

export default function Footer() {
  return (
    <footer className="theme-section relative overflow-hidden border-t border-[#2f2540] pb-0 shadow-[0_-18px_48px_rgba(5,2,8,0.24)]">
      <div className="pointer-events-none absolute top-0 left-[16%] h-80 w-80 rounded-full bg-maze-accent/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-[12%] bottom-0 h-72 w-72 rounded-full bg-maze-signal/8 blur-[110px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 border-b border-[#2f2540]/70 py-8 md:grid-cols-2 md:gap-x-6 md:gap-y-8 xl:grid-cols-12 xl:gap-x-0">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="xl:col-span-4 xl:pr-6"
          >
            <div className="mb-4 flex items-center gap-5">
              <Image
                src="/images/brand/logo-white.svg"
                alt="MazeX Logo"
                width={140}
                height={78}
                className="h-14 w-auto object-contain"
              />
              <a
                href="https://knurdz.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-80"
                aria-label="Powered by Knurdz"
              >
                <Image
                  src="/images/knurdz/knurdz-poweredby.svg"
                  alt="Powered by Knurdz"
                  width={140}
                  height={78}
                  className="h-12 w-auto object-contain"
                />
              </a>
            </div>

            <p className="mb-4 max-w-88 text-sm leading-relaxed text-[#9e8db3]">
              Micromouse Workshop Series &amp; Competition
              <br />
              by IEEE RAS &amp; WIE, University of Moratuwa.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3a3150] bg-white/3 text-white shadow-[0_10px_24px_rgba(5,2,8,0.18)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-maze-accent/70 hover:bg-white/5"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="xl:col-span-2 xl:border-l xl:border-[#2f2540]/60 xl:px-6"
          >
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-maze-accent-soft">
              Quick Links
            </h4>
            <div className="grid grid-cols-1 gap-y-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#b8aacb] transition-colors hover:text-[#f8f2ff]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="xl:col-span-3 xl:border-l xl:border-[#2f2540]/60 xl:px-6"
          >
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-maze-accent-soft">
              Why MazeX
            </h4>
            <ul className="space-y-2">
              {VALUE_POINTS.map((point) => (
                <li
                  key={point}
                  className="relative pl-4 text-sm leading-relaxed text-[#b8aacb] before:absolute before:top-2 before:left-0 before:h-1.5 before:w-1.5 before:rounded-full before:bg-maze-accent/80"
                >
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="xl:col-span-3 xl:border-l xl:border-[#2f2540]/60 xl:pl-6"
          >
            <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-maze-accent-soft">
              Organized By
            </h4>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-4 sm:gap-x-6">
              <a
                href="https://site.ieee.org/sb-moratuwa/chapters/robotics-and-automation-society/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-56 max-w-full transition-opacity hover:opacity-80"
                aria-label="IEEE Robotics and Automation Society"
              >
                <Image
                  src="/images/logos/ieee-ras-white.png"
                  alt="IEEE RAS Logo"
                  width={240}
                  height={100}
                  className="h-auto w-full object-contain object-left"
                />
              </a>
              <a
                href="https://site.ieee.org/sb-moratuwa/chapters/women-in-engineering/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-52 max-w-full transition-opacity hover:opacity-80"
                aria-label="IEEE Women in Engineering"
              >
                <Image
                  src="/images/logos/ieee-wie-white.png"
                  alt="IEEE WIE Logo"
                  width={220}
                  height={90}
                  className="h-auto w-full object-contain object-left"
                />
              </a>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-col gap-2 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"
        >
          <p className="text-sm font-semibold text-[#c9bedb]">
            IEEE Student Branch, University of Moratuwa
          </p>
          <p className="text-xs text-[#8f7ea6]">
            &copy; 2026 MazeX 1.0 - All rights reserved.
            <span className="mx-2">|</span>
            <Link
              href="/privacy-policy"
              className="text-[#8f7ea6] underline-offset-4 hover:text-[#c9bedb] hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
