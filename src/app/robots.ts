import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// 크롤러 접근 규칙. 페이지는 전부 공개 색인 허용하되, 내부 API 라우트는 색인 제외.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
