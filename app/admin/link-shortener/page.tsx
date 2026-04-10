import AdminLinkShortenerManager from "@/components/admin/AdminLinkShortenerManager";
import { listShortLinks } from "@/lib/short-links";

export const dynamic = "force-dynamic";

function getConfiguredBaseUrl() {
  const value =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim() || "";

  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/u, "");
  } catch {
    return "";
  }
}

export default async function AdminLinkShortenerPage() {
  const shortLinks = await listShortLinks(100);

  return (
    <AdminLinkShortenerManager
      configuredBaseUrl={getConfiguredBaseUrl()}
      initialShortLinks={shortLinks}
    />
  );
}
