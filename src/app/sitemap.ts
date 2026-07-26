import type { MetadataRoute } from "next";
import { getAbsoluteSiteUrl } from "@/lib/config/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "/delivery",
    "/payment",
    "/returns",
    "/privacy",
    "/offer",
    "/contacts",
  ];

  return pages.map((path, index) => ({
    url: getAbsoluteSiteUrl(path || "/"),
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.5,
  }));
}
