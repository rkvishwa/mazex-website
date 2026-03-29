"use client";

import { useEffect } from "react";

const EXTRA_GAP = 16;
const RESIZE_DEBOUNCE_MS = 160;
const DEFAULT_NAVBAR_OFFSET = 96;

function isReloadNavigation() {
  const navigationEntry = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined;

  if (navigationEntry) {
    return navigationEntry.type === "reload";
  }

  return performance.navigation.type === 1;
}

function getNavbarOffset() {
  const navbarShell = document.querySelector<HTMLElement>("[data-navbar-shell]");

  if (!navbarShell) {
    return DEFAULT_NAVBAR_OFFSET;
  }

  return navbarShell.getBoundingClientRect().height + EXTRA_GAP;
}

function syncAnchorOffset() {
  document.documentElement.style.setProperty(
    "--anchor-offset",
    `${Math.round(getNavbarOffset())}px`,
  );
}

function getSectionContentTop(target: HTMLElement) {
  const directChildren = Array.from(target.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );

  const primaryContent =
    directChildren.find((child) => {
      const { position, display } = window.getComputedStyle(child);

      return position !== "absolute" && position !== "fixed" && display !== "none";
    }) ?? target;

  return window.scrollY + primaryContent.getBoundingClientRect().top;
}

function scrollToHashTarget(hash: string, behavior: ScrollBehavior) {
  if (!hash || hash === "#") {
    window.scrollTo({ top: 0, behavior });
    return;
  }

  const targetId = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  const navbarOffset = getNavbarOffset();
  const targetRect = target.getBoundingClientRect();
  const absoluteTop = window.scrollY + targetRect.top;
  const contentTop = getSectionContentTop(target);
  const availableHeight = Math.max(window.innerHeight - navbarOffset - EXTRA_GAP, 0);
  const fitsViewport = targetRect.height <= availableHeight;

  const top = fitsViewport
    ? absoluteTop - navbarOffset - Math.max((availableHeight - targetRect.height) / 2, 0)
    : contentTop - navbarOffset;

  window.scrollTo({
    top: Math.max(top, 0),
    behavior,
  });
}

export default function HashScrollManager() {
  useEffect(() => {
    let resizeTimeout: number | undefined;
    const previousScrollRestoration = window.history.scrollRestoration;

    window.history.scrollRestoration = "manual";

    const scheduleScroll = (hash: string, behavior: ScrollBehavior) => {
      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          syncAnchorOffset();
          scrollToHashTarget(hash, behavior);
        });
      }, 0);
    };

    const handleAnchorClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const clickTarget = event.target;

      if (!(clickTarget instanceof Element)) {
        return;
      }

      const anchor = clickTarget.closest<HTMLAnchorElement>('a[href^="#"]');

      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!href) {
        return;
      }

      event.preventDefault();

      const nextUrl =
        href === "#"
          ? `${window.location.pathname}${window.location.search}`
          : `${window.location.pathname}${window.location.search}${href}`;

      if (window.location.hash === href || href === "#") {
        window.history.replaceState(null, "", nextUrl);
      } else {
        window.history.pushState(null, "", nextUrl);
      }

      scheduleScroll(href, "smooth");
    };

    const handleHashChange = () => {
      scheduleScroll(window.location.hash, "smooth");
    };

    const handlePopState = () => {
      scheduleScroll(window.location.hash, "auto");
    };

    const handleResize = () => {
      syncAnchorOffset();

      if (!window.location.hash) {
        return;
      }

      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        scrollToHashTarget(window.location.hash, "auto");
      }, RESIZE_DEBOUNCE_MS);
    };

    document.addEventListener("click", handleAnchorClick);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("resize", handleResize);
    syncAnchorOffset();

    if (isReloadNavigation()) {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;

      window.history.replaceState(null, "", cleanUrl);
      window.scrollTo({ top: 0, behavior: "auto" });
    } else if (window.location.hash) {
      scheduleScroll(window.location.hash, "auto");
    }

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("resize", handleResize);

      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }

      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  return null;
}
