import "server-only";

import { CATEGORIES } from "./categories";
import { MOCK_ARTICLES } from "./mock-articles";
import { getSupabaseAnonServer } from "./supabase-server";
import type { Article } from "./types";

const CATEGORY_SET = new Set<string>(CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id));
const FALLBACK_CATEGORY: Article["category"] = "LLM";

// 동적 select(views_count 유무) 때문에 supabase 추론 타입 대신 명시 타입으로 매핑한다.
type ArticleRow = {
  id: string | number;
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string | null;
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
      .limit(60);

  // views_count 컬럼이 있으면 함께 가져오고, 아직 SQL 을 안 돌려 컬럼이 없으면 views 없이 재조회한다.
  // (실데이터 피드가 컬럼 미생성 때문에 mock 으로 떨어지지 않도록 graceful degradation)
  let { data, error } = await query(`${BASE_COLS}, views_count`);
  if (error) {
    ({ data, error } = await query(BASE_COLS));
  }

  if (error) {
    console.error("[articles] supabase fetch failed:", error.message);
    return { articles: sortMock(), usingMock: true };
  }

  if (!data || data.length === 0) {
    // Supabase is configured but the cron hasn't populated anything yet — keep mock so the page isn't empty.
    return { articles: sortMock(), usingMock: true };
  }

  const articles: Article[] = (data as unknown as ArticleRow[]).map((row) => ({
    id: String(row.id),
    title: row.title,
    url: row.url,
    source: row.source,
    category: normalizeCategory(row.category),
    summary: row.summary ?? "",
    thumbnail_url: row.thumbnail_url ?? null,
    published_at: row.published_at,
    likes_count: row.likes_count ?? 0,
    views_count: row.views_count ?? 0,
  }));

  return { articles, usingMock: false };
}

function sortMock(): Article[] {
  return [...MOCK_ARTICLES].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );
}
