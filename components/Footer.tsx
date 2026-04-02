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

export default function Footer() {
  return (
    <footer className="theme-section relative overflow-hidden border-t border-[#2f2540] pb-0">
      <div className="pointer-events-none absolute top-0 left-[18%] h-72 w-72 rounded-full bg-maze-accent/8 blur-[120px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 border-b border-[#2f2540]/70 py-8 md:grid-cols-2 lg:grid-cols-[auto_1fr] lg:gap-28">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-5 flex items-center gap-5">
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
                className="rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maze-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-maze-bg-soft"
                aria-label="Powered by Knurdz"
              >
                <Image
                  src="/images/knurdz/knurdz-poweredby.svg"
                  alt="Powered by Knurdz"
                  width={140}
                  height={78}
                  className="h-13 w-auto object-contain"
                />
              </a>
            </div>

            <p className="mb-6 mt-2 text-[15px] font-normal leading-relaxed text-[#a898bf]">
              Micromouse Workshop Series &amp; Competition<br />
              by IEEE RAS &amp; WIE, University of Moratuwa.
            </p>
            <div className="flex flex-wrap items-center gap-4">
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
                    <Icon className="h-6 w-6" />
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
            className="lg:border-l lg:border-[#2f2540]/65 lg:pl-28"
          >
            <h4 className="mb-4 text-[0.8rem] font-bold uppercase tracking-[0.22em] text-maze-accent-soft">
              Organized By
            </h4>

            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-12">
              <a
                href="https://site.ieee.org/sb-moratuwa/chapters/robotics-and-automation-society/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-56 max-w-full rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maze-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-maze-bg-soft"
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
                className="w-64 max-w-full rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maze-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-maze-bg-soft"
                aria-label="IEEE Women in Engineering"
              >
                <Image
                  src="/images/logos/ieee-wie-white.png"
                  alt="IEEE WIE Logo"
                  width={256}
                  height={104}
                  className="h-auto w-full object-contain object-left"
                />
              </a>
            </div>

            <p className="mt-5 text-sm leading-6 text-[#a898bf]">
              IEEE Robotics & Automation Society and Women in Engineering at University of Moratuwa dedicated to fostering innovation and technical excellence in robotics.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-col gap-2 py-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"
        >
          <p className="text-base font-semibold text-[#d2c8e0]">
            IEEE Student Branch, University of Moratuwa
          </p>
          <p className="text-sm text-[#9383aa]">
            &copy; 2026 MazeX 1.0 - All rights reserved.
            <span className="mx-2">|</span>
            <Link
              href="/privacy-policy"
              className="text-[#9383aa] underline-offset-4 hover:text-[#d2c8e0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maze-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-maze-bg-soft"
            >
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
