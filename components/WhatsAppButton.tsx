"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";

const whatsappLink = "https://whatsapp.com/channel/0029Vb7eiSyDTkJwKt2PQT2W";

export default function WhatsAppButton() {
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setIsVisible(true);
    let observer: IntersectionObserver | null = null;

    const timeoutId = setTimeout(() => {
      const footer = document.getElementById("site-footer");
      if (!footer) return;

      observer = new IntersectionObserver(
        (entries) => {
          setIsVisible(!entries[0].isIntersecting);
        },
        { root: null, threshold: 0 }
      );

      observer.observe(footer);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [pathname]);

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with MazeX on WhatsApp"
      className={`fixed right-5 bottom-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[#380d4f] text-white shadow-[0_1rem_2rem_rgba(56,13,79,0.35)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#020104] sm:right-7 sm:bottom-7 ${
        isVisible
          ? "translate-y-0 opacity-100 hover:-translate-y-1 hover:scale-105 hover:bg-[#4a1467]"
          : "pointer-events-none translate-y-8 opacity-0"
      }`}
    >
      <FaWhatsapp className="h-7 w-7" aria-hidden="true" />
    </a>
  );
}
