import "server-only";

import { runPool } from "./pool";

// 기사 페이지 <head> 의 og:image(없으면 twitter:image) 를 뽑아 대표 이미지로 쓴다.
// RSS 가 이미지를 안 줄 때(특히 한국 매체)의 보강용.
const OG_PATTERNS = [
  /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
];

// Google News 리다이렉트 URL 은 어느 기사든 og:image 가 '구글 뉴스 기본 로고'로 동일하게 나온다.
// → 진짜 대표 이미지가 아니므로 og 추출 대상에서 제외(폴백 에디토리얼 커버로 둔다).
export function isResolvableForOg(url: string): boolean {
  try {
    return new URL(url).hostname !== "news.google.com";
  } catch {
    return false;
  }
}

export async function fetchOgImage(pageUrl: string, timeoutMs = 5000): Promise<string | null> {
  if (!isResolvableForOg(pageUrl)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ai-news-bot/1.0)" },
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    // <head> 의 og 태그만 필요하므로 앞부분만 본다(대용량 본문 파싱 방지).
    const html = (await res.text()).slice(0, 250_000);
    for (const re of OG_PATTERNS) {
      const m = html.match(re);
      if (m?.[1]) {
        try {
          return new URL(m[1], pageUrl).toString();
        } catch {
          return m[1];
        }
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type ThumbRow = { url: string; thumbnail_url: string | null };

/**
 * thumbnail 이 비어있고 og 추출이 가능한(=Google News 가 아닌) row 들의 thumbnail_url 을
 * og:image 로 채운다(in-place 변경). 동시성·예산을 제한해 cron(maxDuration 60s)을 넘기지 않게 한다.
 * @returns 사용하고 남은 예산
 */
export async function enrichThumbnails(
  rows: ThumbRow[],
  budget: number,
  concurrency = 10,
): Promise<number> {
  const targets = rows.filter((r) => !r.thumbnail_url && isResolvableForOg(r.url)).slice(0, budget);
  await runPool(targets, concurrency, async (row) => {
    const og = await fetchOgImage(row.url);
    if (og) row.thumbnail_url = og;
  });
  return budget - targets.length;
}
