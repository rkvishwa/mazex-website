import type { Metadata } from "next";
import ShortLinkRedirectClient from "@/components/ShortLinkRedirectClient";
import {
  getShortLinkByCode,
  normalizeShortCodeInput,
  trackShortLinkVisit,
} from "@/lib/short-links";

type PageProps = {
  params: Promise<{ shortName: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redirecting | MazeX",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function ShortLinkRedirectPage({ params }: PageProps) {
  const { shortName } = await params;
  const normalizedShortCode = normalizeShortCodeInput(shortName);

  if (!normalizedShortCode) {
    return (
      <ShortLinkRedirectClient
        destinationUrl={null}
        shortCode={shortName}
        state="missing"
      />
    );
  }

  const shortLink = await getShortLinkByCode(normalizedShortCode);

  if (!shortLink) {
    return (
      <ShortLinkRedirectClient
        destinationUrl={null}
        shortCode={normalizedShortCode}
        state="missing"
      />
    );
  }

  if (shortLink.status === "expired") {
    return (
      <ShortLinkRedirectClient
        destinationUrl={shortLink.destinationUrl}
        shortCode={shortLink.shortCode}
        state="expired"
      />
    );
  }

  if (shortLink.status === "inactive") {
    return (
      <ShortLinkRedirectClient
        destinationUrl={shortLink.destinationUrl}
        shortCode={shortLink.shortCode}
        state="inactive"
      />
    );
  }

  void trackShortLinkVisit(shortLink);

  return (
    <ShortLinkRedirectClient
      destinationUrl={shortLink.destinationUrl}
      shortCode={shortLink.shortCode}
      state="redirecting"
    />
  );
}
