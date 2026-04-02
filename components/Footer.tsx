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
        <div className="grid grid-cols-1 gap-8 border-b border-[#2f2540]/70 py-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 flex items-center gap-5">
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
                  className="h-13 w-auto object-contain"
                />
              </a>
            </div>

            <p className="mb-4 max-w-88 text-[0.95rem] leading-7 text-[#a898bf]">
              Micromouse Workshop Series &amp; Competition
              <br />
              by IEEE RAS &amp; WIE, University of Moratuwa.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#3a3150] bg-white/3 text-[#d8cfeb] transition-colors hover:border-maze-accent/70 hover:text-white"
                  >
                    <Icon className="h-4.5 w-4.5" />
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
            className="lg:pt-1"
          >
            <h4 className="mb-4 text-[0.8rem] font-bold uppercase tracking-[0.22em] text-maze-accent-soft">
              Organized By
            </h4>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-4">
              <a
                href="https://site.ieee.org/sb-moratuwa/chapters/robotics-and-automation-society/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-60 max-w-full transition-opacity hover:opacity-80"
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
                className="w-60 max-w-full transition-opacity hover:opacity-80"
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
          className="flex flex-col gap-2 py-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"
        >
          <p className="text-[0.95rem] font-semibold text-[#d2c8e0]">
            IEEE Student Branch, University of Moratuwa
          </p>
          <p className="text-[0.8rem] text-[#9383aa]">
            &copy; 2026 MazeX 1.0 - All rights reserved.
            <span className="mx-2">|</span>
            <Link
              href="/privacy-policy"
              className="text-[#9383aa] underline-offset-4 hover:text-[#d2c8e0] hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
