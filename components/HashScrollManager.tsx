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
    `${(Math.round(getNavbarOffset())) / 16}rem`,
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

    const scheduleScroll = (hash: string, behavior: ScrollBehavior, clearHashAfter = false) => {
      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          syncAnchorOffset();
          scrollToHashTarget(hash, behavior);

          if (clearHashAfter) {
            // Remove the hash from the URL after the scroll animation completes
            // so that mobile viewport resize events (browser toolbar show/hide)
            // don't re-snap the page back to the section.
            const delay = behavior === "smooth" ? 500 : 100;
            window.setTimeout(() => {
              if (window.location.hash === hash) {
                const cleanUrl = `${window.location.pathname}${window.location.search}`;
                window.history.replaceState(null, "", cleanUrl);
              }
            }, delay);
          }
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

      const anchor = clickTarget.closest<HTMLAnchorElement>("a[href]");

      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!href) {
        return;
      }

      let nextHash = "#";
      let isSameDocumentHashLink = href === "#";

      if (!isSameDocumentHashLink) {
        const currentUrl = new URL(window.location.href);
        const anchorUrl = new URL(anchor.href, currentUrl);

        const isSamePageNoHash =
          !anchorUrl.hash &&
          anchorUrl.origin === currentUrl.origin &&
          anchorUrl.pathname === currentUrl.pathname &&
          anchorUrl.search === currentUrl.search;

        // Same page, no hash (e.g. logo linking to "/") → scroll to top
        if (isSamePageNoHash) {
          event.preventDefault();
          window.history.replaceState(null, "", `${currentUrl.pathname}${currentUrl.search}`);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        isSameDocumentHashLink =
          Boolean(anchorUrl.hash) &&
          anchorUrl.origin === currentUrl.origin &&
          anchorUrl.pathname === currentUrl.pathname &&
          anchorUrl.search === currentUrl.search;

        if (!isSameDocumentHashLink) {
          return;
        }

        nextHash = anchorUrl.hash;
      }

      event.preventDefault();

      const nextUrl =
        nextHash === "#"
          ? `${window.location.pathname}${window.location.search}`
          : `${window.location.pathname}${window.location.search}${nextHash}`;

      if (window.location.hash === nextHash || nextHash === "#") {
        window.history.replaceState(null, "", nextUrl);
      } else {
        window.history.pushState(null, "", nextUrl);
      }

      scheduleScroll(nextHash, "smooth", true);
    };

    const handleHashChange = () => {
      scheduleScroll(window.location.hash, "smooth", true);
    };

    const handlePopState = () => {
      scheduleScroll(window.location.hash, "auto", true);
    };

    const handleResize = () => {
      syncAnchorOffset();

      // Do not re-scroll on resize (e.g. mobile browser toolbar collapse/expand).
      // The hash is cleared from the URL after a nav-link scroll, so this guard
      // only fires for genuine deep-link / page-load scenarios where the hash
      // is intentionally present.
      if (!window.location.hash) {
        return;
      }

      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        scrollToHashTarget(window.location.hash, "auto");
      }, RESIZE_DEBOUNCE_MS);
    };

    const handleBeforeUnload = () => {
      // Re-enable browser native scroll restoration right before reload/leave
      // so the browser instantly restores the scroll position on the next load
      // before rendering, avoiding any visual "jump" from a React useEffect.
      window.history.scrollRestoration = "auto";
    };

    document.addEventListener("click", handleAnchorClick);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("resize", handleResize);
    window.addEventListener("beforeunload", handleBeforeUnload);
    syncAnchorOffset();

    if (isReloadNavigation()) {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;

      // Drop the hash cleanly without overriding the natively restored scroll position
      window.history.replaceState(null, "", cleanUrl);
    } else if (window.location.hash) {
      scheduleScroll(window.location.hash, "auto", true);
    }

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }

      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  return null;
}
