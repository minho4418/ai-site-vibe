import "server-only";

import { CATEGORIES } from "./categories";
import { MOCK_ARTICLES } from "./mock-articles";
import { getSupabaseAnonServer } from "./supabase-server";
import type { Article } from "./types";

const CATEGORY_SET = new Set<string>(CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id));
const FALLBACK_CATEGORY: Article["category"] = "LLM";

function normalizeCategory(raw: string): Article["category"] {
  return (CATEGORY_SET.has(raw) ? raw : FALLBACK_CATEGORY) as Article["category"];
}

export async function getArticles(): Promise<{ articles: Article[]; usingMock: boolean }> {
  const supabase = getSupabaseAnonServer();
  if (!supabase) {
    return { articles: sortMock(), usingMock: true };
  }

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, url, source, category, summary, thumbnail_url, published_at, likes_count")
    .order("published_at", { ascending: false })
    // published_at 동률(특히 RSS 시간이 비었던 fallback row 들) 시 안정 정렬을 위한 tie-breaker.
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(60);

  if (error) {
    console.error("[articles] supabase fetch failed:", error.message);
    return { articles: sortMock(), usingMock: true };
  }

  if (!data || data.length === 0) {
    // Supabase is configured but the cron hasn't populated anything yet — keep mock so the page isn't empty.
    return { articles: sortMock(), usingMock: true };
  }

  const articles: Article[] = data.map((row) => ({
    id: String(row.id),
    title: row.title,
    url: row.url,
    source: row.source,
    category: normalizeCategory(row.category),
    summary: row.summary ?? "",
    thumbnail_url: row.thumbnail_url ?? null,
    published_at: row.published_at,
    likes_count: row.likes_count ?? 0,
  }));

  return { articles, usingMock: false };
}

function sortMock(): Article[] {
  return [...MOCK_ARTICLES].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );
}
