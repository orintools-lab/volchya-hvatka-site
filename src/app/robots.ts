import type { MetadataRoute } from "next";
import { getAbsoluteSiteUrl, getSiteUrl } from "@/lib/config/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: getAbsoluteSiteUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
