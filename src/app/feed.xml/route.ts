import { getArticles } from "@/lib/articles";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// 사이트 자체 RSS 출력. 긁어오기만 하던 사이트가 자기 피드도 내보내 구독 채널을 연다.
// 항목 링크는 원문(외부)로 — 헤드라인+한국어 요약+원문 링크아웃이라는 사이트 모델 그대로.
// 기사는 DB 에서 오므로 매 요청 생성하되, CDN 에 15분 캐시(s-maxage)해 부하를 막는다.
export const dynamic = "force-dynamic";

const FEED_SIZE = 50;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const { articles } = await getArticles();
  const items = articles.slice(0, FEED_SIZE);

  const lastBuild = new Date().toUTCString();
  const body = items
    .map((a) => {
      const desc = (a.ai_summary && a.ai_summary.trim()) || a.summary || "";
      const pub = new Date(a.published_at);
      const pubDate = Number.isNaN(pub.getTime()) ? lastBuild : pub.toUTCString();
      return [
        "    <item>",
        `      <title>${escapeXml(a.title)}</title>`,
        `      <link>${escapeXml(a.url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(a.url)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <category>${escapeXml(a.category)}</category>`,
        desc ? `      <description>${escapeXml(desc)}</description>` : "",
        `      <source url="${escapeXml(SITE_URL)}">${escapeXml(a.source)}</source>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} - 오늘의 AI 뉴스</title>
    <link>${escapeXml(SITE_URL)}</link>
    <atom:link href="${escapeXml(SITE_URL)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ko</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${body}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
