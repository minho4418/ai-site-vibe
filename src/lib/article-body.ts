import "server-only";

// 기사 페이지 HTML 을 받아 본문 텍스트만 거칠게 뽑는다(readability-lite).
// 상세 요약(detail summary)의 입력으로 쓰며, 카드용 짧은 요약(ai-summary.ts, RSS 기반)과 별개다.
// 완벽한 본문 추출이 목적이 아니라 LLM 이 핵심을 잡을 만큼의 텍스트면 충분하다.

import { isResolvableForOg } from "./og-image";

// 본문이 아닌 영역(스크립트/스타일/네비 등)을 통째로 제거.
const STRIP_BLOCKS_RE =
  /<(script|style|noscript|nav|header|footer|aside|form|svg)\b[^>]*>[\s\S]*?<\/\1>/gi;
const TAG_RE = /<[^>]+>/g;
const WS_RE = /[ \t\f\v]+/g;
const MULTINEWLINE_RE = /\n\s*\n\s*\n+/g;

// 본문 입력 길이 상한. Groq 8b free tier 의 분당 토큰 한도(TPM 6000)를 고려해
// 건당 ~3k 토큰 이하로 떨어지도록 잡는다(핵심 포인트 추출엔 충분).
/** HTML 에서 본문으로 보이는 텍스트를 뽑는다. 너무 짧으면(추출 실패) null. */
export function extractBodyText(html: string, maxLen = 3500): string | null {
  // <body> 안쪽만 대상으로(헤더 메타 잡음 줄임). 못 찾으면 전체.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let work = bodyMatch ? bodyMatch[1] : html;

  work = work.replace(STRIP_BLOCKS_RE, " ");

  // <p>/<br>/</div>/<li>/제목 태그를 줄바꿈으로 바꿔 문단 구분을 살린다.
  work = work
    .replace(/<\/(p|div|section|article|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>(?=)/gi, "\n");

  const text = work
    .replace(TAG_RE, " ")
    // 흔한 HTML 엔티티 최소 디코드.
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(WS_RE, " ")
    .replace(MULTINEWLINE_RE, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    // 메뉴/버튼 같은 짧은 잡음 줄 제거(긴 문장 위주로 남김).
    .filter((line) => line.length >= 40)
    .join("\n")
    .trim();

  if (text.length < 200) return null; // 본문이라 보기 어려움 → 실패 처리
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

/**
 * 기사 URL 의 본문 텍스트를 가져온다. Google News 리다이렉트(본문 못 가져옴)는 즉시 null.
 * @returns 본문 텍스트 또는 null(가져오기/추출 실패·미지원)
 */
export async function fetchArticleBody(pageUrl: string, timeoutMs = 9000): Promise<string | null> {
  if (!isResolvableForOg(pageUrl)) return null; // news.google.com 등은 본문 추출 불가
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ai-news-bot/1.0; +https://github.com/minho4418/ai-site-vibe)",
      },
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    // 대용량 본문 폭주 방지: 앞 600KB 만.
    const html = (await res.text()).slice(0, 600_000);
    return extractBodyText(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
