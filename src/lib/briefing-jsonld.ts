import { SITE_URL } from "@/lib/site";
import type { Briefing } from "@/lib/briefing-types";

// 오늘의 브리핑 1건을 schema.org NewsArticle JSON-LD 로 변환한다(GEO/구조화 데이터).
//  - 생성형 답변엔진(ChatGPT·Perplexity·Gemini·AI Overviews)과 검색엔진이
//    headline·발행일·출처(citation)를 기계가 읽어 "이 날짜의 AI 뉴스 정리"로 이해·인용하게 한다.
//  - author/publisher 는 layout 의 전역 @graph 에 정의된 #organization 노드를 @id 로 참조.
//  - 발행 시각은 루틴 스케줄(오전 8시 KST) 기준 — 신선도 신호.
export function briefingJsonLd(briefing: Briefing) {
  const url = `${SITE_URL}/daily/${briefing.date}`;
  const publishedAt = `${briefing.date}T08:00:00+09:00`;

  // 각 항목의 외부 출처 URL 을 인용(citation)으로 노출 → 답변엔진이 근거를 추적·신뢰.
  const citation = Array.from(
    new Set(
      briefing.sections
        .flatMap((s) => s.items)
        .map((i) => i.url)
        .filter((u): u is string => !!u && /^https?:\/\//i.test(u)),
    ),
  ).map((u) => ({ "@type": "CreativeWork", url: u }));

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    // Google 권장: headline ≤ 110자.
    headline: (briefing.title ?? "오늘의 AI·개발 브리핑").slice(0, 110),
    ...(briefing.summary ? { description: briefing.summary } : {}),
    inLanguage: "ko-KR",
    datePublished: publishedAt,
    dateModified: publishedAt,
    isAccessibleForFree: true,
    articleSection: briefing.sections.map((s) => s.heading),
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    ...(citation.length ? { citation } : {}),
  };
}
