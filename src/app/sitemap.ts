import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// 검색엔진 크롤러용 사이트맵. 기사는 외부 원문으로 링크되어 자체 페이지가 없으므로
// 색인 대상은 실제 우리 라우트(홈·랭킹)뿐이다. 홈은 매일 갱신, 랭킹은 1시간 ISR.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/ranking`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/education`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];
}
