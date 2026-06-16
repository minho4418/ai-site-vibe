import type { MetadataRoute } from "next";

import { listBriefings } from "@/lib/briefings";
import { SITE_URL } from "@/lib/site";

// 검색엔진 크롤러용 사이트맵. 기사는 외부 원문으로 링크되어 자체 페이지가 없으므로
// 색인 대상은 실제 우리 라우트(홈·랭킹·교육·오늘의 브리핑)뿐이다.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 오늘의 브리핑 날짜별 페이지(최신 90개). 각 날짜를 lastModified 로 써 안정적인 색인.
  const briefings: MetadataRoute.Sitemap = (await listBriefings(90)).map(({ date }) => ({
    url: `${SITE_URL}/daily/${date}`,
    lastModified: new Date(`${date}T00:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/daily`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
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
    ...briefings,
  ];
}
