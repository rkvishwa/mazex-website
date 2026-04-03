"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";

const whatsappLink = "https://whatsapp.com/channel/0029Vb7eiSyDTkJwKt2PQT2W";

export default function WhatsAppButton() {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let mounted = true;

    const initObserver = () => {
      const footer = document.getElementById("site-footer");
      if (!footer) return false;

      observer = new IntersectionObserver(
        ([entry]) => {
          if (mounted) {
            setIsIntersecting(entry.isIntersecting);
          }
        },
        {
          root: null,
          threshold: 0,
          rootMargin: "0px 0px 40px 0px", // Trigger 40px before footer enters
        }
      );

      observer.observe(footer);
      return true;
    };

    // Initial attempt after a short delay for hydration/rendering
    const timeoutId = setTimeout(() => {
      if (!initObserver() && mounted) {
        // Retry logic if footer not found immediately
        intervalId = setInterval(() => {
          if (initObserver()) {
            if (intervalId) clearInterval(intervalId);
          }
        }, 500);
      }
    }, 200);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
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
      className={`fixed right-5 bottom-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#380d4f] text-white shadow-[0_1rem_2rem_rgba(56,13,79,0.35)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#020104] sm:right-7 sm:bottom-7 sm:h-14 sm:w-14 md:h-16 md:w-16 ${
        !isIntersecting
          ? "translate-y-0 opacity-100 hover:-translate-y-1 hover:scale-105 hover:bg-[#4a1467]"
          : "pointer-events-none translate-y-8 opacity-0"
      }`}
    >
      <FaWhatsapp
        className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
        aria-hidden="true"
      />
    </a>
  );
}
