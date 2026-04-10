"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { ExternalLink, MoveRight } from "lucide-react";
import Footer from "@/components/Footer";
import HexBackground from "@/components/HexBackground";
import Navbar from "@/components/Navbar";

type RedirectState = "redirecting" | "missing" | "expired" | "inactive";

function getHeadline(state: RedirectState) {
  if (state === "redirecting") {
    return "Opening your destination";
  }

  if (state === "expired") {
    return "This short link has expired";
  }

  if (state === "inactive") {
    return "This short link is temporarily disabled";
  }

  return "This short link is unavailable";
}

function getDescription(state: RedirectState) {
  if (state === "redirecting") {
    return "Redirecting instantly. If your browser does not switch on its own, use the destination link below.";
  }

  if (state === "expired") {
    return "The link has passed its expiry date, so redirects are no longer allowed.";
  }

  if (state === "inactive") {
    return "";
  }

  return "This short link may have been deleted, mistyped, or is no longer available.";
}

export default function ShortLinkRedirectClient({
  destinationUrl,
  shortCode,
  state,
}: {
  destinationUrl: string | null;
  shortCode: string;
  state: RedirectState;
}) {
  const showDestinationActions = state !== "inactive" && Boolean(destinationUrl);

  useEffect(() => {
    if (state !== "redirecting" || !destinationUrl) {
      return;
    }

    window.location.replace(destinationUrl);
  }, [destinationUrl, state]);

  return (
    <>
      <Navbar />
      <main className="site-shell min-h-screen flex flex-col pt-20">
        <div aria-hidden="true" className="site-background">
          <div className="site-background-glow site-background-glow-primary" />
          <div className="site-background-glow site-background-glow-secondary" />
          <div className="site-background-glow site-background-glow-tertiary" />
          <HexBackground opacity={0.22} />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-10 pb-16 sm:px-6">
          <div className="theme-card w-full max-w-2xl p-6 sm:p-8 md:p-10">
            <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
              <a
                href="https://knurdz.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-none transition-opacity hover:opacity-80"
                aria-label="Powered by Knurdz"
              >
                <Image
                  src="/images/knurdz/knurdz-poweredby-light.svg"
                  alt="Powered by Knurdz"
                  width={320}
                  height={64}
                  priority
                  className="h-14 w-auto opacity-95 [@media(prefers-color-scheme:dark)]:hidden sm:h-16"
                />
                <Image
                  src="/images/knurdz/knurdz-poweredby.svg"
                  alt="Powered by Knurdz"
                  width={320}
                  height={64}
                  priority
                  className="hidden h-14 w-auto opacity-95 [@media(prefers-color-scheme:dark)]:block sm:h-16"
                />
              </a>

              <span className="theme-kicker mt-6">/url/{shortCode}</span>

              <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {getHeadline(state)}
              </h1>
              <p className="theme-copy mt-3 max-w-xl text-sm leading-relaxed sm:text-base">
                {getDescription(state)}
              </p>

              {showDestinationActions ? (
                <div className="mt-8 w-full rounded-2xl border border-white/8 bg-white/3 p-5 text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Destination URL
                  </p>
                  <a
                    href={destinationUrl}
                    className="mt-3 block break-all text-sm font-medium text-slate-100 transition hover:text-white sm:text-base"
                  >
                    {destinationUrl}
                  </a>
                </div>
              ) : null}

              <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                {showDestinationActions ? (
                  <a
                    href={destinationUrl}
                    className="theme-button inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white"
                  >
                    Open destination
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}

                <Link
                  href="/"
                  className="theme-button-secondary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
                >
                  Return home
                  <MoveRight className="h-4 w-4" />
                </Link>
              </div>

            </div>
          </div>
        </div>

        <Footer />
      </main>
    </>
  );
}
