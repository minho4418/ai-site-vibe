import "server-only";

import { CATEGORIES } from "./categories";
import { MOCK_ARTICLES } from "./mock-articles";
import { getSupabaseAnonServer } from "./supabase-server";
import type { Article } from "./types";

const CATEGORY_SET = new Set<string>(CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id));
const FALLBACK_CATEGORY: Article["category"] = "LLM";

// 홈에 표출할 기사 수.
const FEED_SIZE = 80;
// 한 소스가 홈 상위를 독식하지 못하도록 소스당 상한. 초과분은 다른 소스로 자리를 양보한다.
const MAX_PER_SOURCE = 5;
// 솎아내기(soft-cap) 후에도 FEED_SIZE 를 채우려면 후보를 넉넉히 가져온다.
const CANDIDATE_LIMIT = 200;

/**
 * published_at 내림차순으로 정렬된 후보에서, 소스당 MAX_PER_SOURCE 개까지 먼저 채우고
 * 자리가 남으면 상한을 넘긴 글(overflow)을 원래 순서대로 backfill 해 FEED_SIZE 를 보장한다.
 * → 특정 소스(시간이 비어 fallback 으로 최신처럼 찍힌 글 포함)가 홈 상단을 독식하는 걸 막는다.
 */
function capPerSource(sorted: Article[]): Article[] {
  const picked: Article[] = [];
  const overflow: Article[] = [];
  const counts = new Map<string, number>();
  for (const a of sorted) {
    if (picked.length >= FEED_SIZE) break;
    const n = counts.get(a.source) ?? 0;
    if (n < MAX_PER_SOURCE) {
      picked.push(a);
      counts.set(a.source, n + 1);
    } else {
      overflow.push(a);
    }
  }
  for (const a of overflow) {
    if (picked.length >= FEED_SIZE) break;
    picked.push(a);
  }
  return picked;
}

// 동적 select(views_count 유무) 때문에 supabase 추론 타입 대신 명시 타입으로 매핑한다.
type ArticleRow = {
  id: string | number;
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string | null;
  ai_summary?: string | null;
  thumbnail_url: string | null;
  published_at: string;
  likes_count: number | null;
  views_count?: number | null;
};

function normalizeCategory(raw: string): Article["category"] {
  return (CATEGORY_SET.has(raw) ? raw : FALLBACK_CATEGORY) as Article["category"];
}

const BASE_COLS = "id, title, url, source, category, summary, thumbnail_url, published_at, likes_count";

export async function getArticles(): Promise<{ articles: Article[]; usingMock: boolean }> {
  const supabase = getSupabaseAnonServer();
  if (!supabase) {
    return { articles: sortMock(), usingMock: true };
  }

  const query = (cols: string) =>
    supabase
      .from("articles")
      .select(cols)
      .order("published_at", { ascending: false })
      // published_at 동률(특히 RSS 시간이 비었던 fallback row 들) 시 안정 정렬을 위한 tie-breaker.
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      // 소스당 상한으로 솎아낸 뒤에도 FEED_SIZE 를 채우도록 후보를 넉넉히 가져온다.
      .limit(CANDIDATE_LIMIT);

  // 선택 컬럼(views_count, ai_summary)이 있으면 함께 가져오고, 아직 SQL 을 안 돌려 없으면 단계적으로 빼고 재조회한다.
  // (실데이터 피드가 컬럼 미생성 때문에 mock 으로 떨어지지 않도록 graceful degradation)
  const COL_ATTEMPTS = [
    `${BASE_COLS}, views_count, ai_summary`,
    `${BASE_COLS}, views_count`,
    BASE_COLS,
  ];
  let { data, error } = await query(COL_ATTEMPTS[0]);
  for (let i = 1; error && i < COL_ATTEMPTS.length; i++) {
    ({ data, error } = await query(COL_ATTEMPTS[i]));
  }

  if (error) {
    console.error("[articles] supabase fetch failed:", error.message);
    return { articles: sortMock(), usingMock: true };
  }

  if (!data || data.length === 0) {
    // Supabase is configured but the cron hasn't populated anything yet — keep mock so the page isn't empty.
    return { articles: sortMock(), usingMock: true };
  }

  const mapped: Article[] = (data as unknown as ArticleRow[]).map((row) => ({
    id: String(row.id),
    title: row.title,
    url: row.url,
    source: row.source,
    category: normalizeCategory(row.category),
    summary: row.summary ?? "",
    // AI 한국어 요약이 있으면 우선 사용하고, 없으면 RSS 요약으로 폴백(소비처에서 처리).
    ai_summary: row.ai_summary ?? null,
    thumbnail_url: row.thumbnail_url ?? null,
    published_at: row.published_at,
    likes_count: row.likes_count ?? 0,
    views_count: row.views_count ?? 0,
  }));

  // 소스당 상한으로 솎아 홈 상단 쏠림을 막는다(상세는 capPerSource 주석).
  return { articles: capPerSource(mapped), usingMock: false };
}

function sortMock(): Article[] {
  return [...MOCK_ARTICLES].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );
}
