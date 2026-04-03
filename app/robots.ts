import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/signin/", "/login/"],
      },
    ],
    sitemap: "https://mazex.knurdz.org/sitemap.xml",
    host: "https://mazex.knurdz.org",
  };
}
