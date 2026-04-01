"use client";

import { motion } from "framer-motion";
import Image from "next/image";
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

export default function Footer() {
  return (
    <footer className="theme-section relative overflow-hidden border-t border-[#2f2540] pb-0 shadow-[0_-18px_48px_rgba(5,2,8,0.24)]">
      <div className="pointer-events-none absolute top-0 left-[16%] h-80 w-80 rounded-full bg-[#6b528f]/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-[12%] bottom-0 h-72 w-72 rounded-full bg-[#5a4b73]/8 blur-[110px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 border-b border-[#2f2540]/70 py-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 flex items-center gap-6">
              <Image
                src="/images/brand/logo-white.svg"
                alt="MazeX Logo"
                width={140}
                height={78}
                className="h-16 w-auto object-contain"
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
                  className="h-14 w-auto object-contain"
                />
              </a>
            </div>

            <p className="mb-6 max-w-xl text-sm leading-relaxed text-[#9e8db3]">
              Micromouse Workshop Series &amp; Competition organized by IEEE RAS
              and WIE at the University of Moratuwa.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3a3150] bg-white/[0.03] text-white shadow-[0_10px_28px_rgba(5,2,8,0.18)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#6b528f]/70 hover:bg-white/[0.05]"
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
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h4 className="mb-6 text-sm font-bold uppercase tracking-[0.28em] text-[#8a73a6]">
              Organized By
            </h4>

            <div className="flex flex-wrap items-center gap-6">
              <a
                href="https://site.ieee.org/sb-moratuwa/chapters/robotics-and-automation-society/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-80"
                aria-label="IEEE Robotics and Automation Society"
              >
                <Image
                  src="/images/logos/ieee-ras-white.png"
                  alt="IEEE RAS Logo"
                  width={240}
                  height={100}
                  className="h-16 w-auto object-contain object-left"
                />
              </a>
              <a
                href="https://site.ieee.org/sb-moratuwa/chapters/women-in-engineering/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-80"
                aria-label="IEEE Women in Engineering"
              >
                <Image
                  src="/images/logos/ieee-wie-white.png"
                  alt="IEEE WIE Logo"
                  width={220}
                  height={90}
                  className="h-14 w-auto object-contain object-left"
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
          className="flex flex-col gap-2 py-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"
        >
          <p className="text-sm font-semibold text-[#c9bedb]">
            IEEE Student Branch, University of Moratuwa
          </p>
          <p className="text-xs text-[#8f7ea6]">
            &copy; 2026 MazeX 1.0 - All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
