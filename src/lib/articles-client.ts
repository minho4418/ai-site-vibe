"use client";

import { CATEGORIES } from "./categories";
import { getSupabaseBrowser } from "./supabase-browser";
import type { Article } from "./types";

const CATEGORY_SET = new Set<string>(CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id));

// 같은 기사를 한 세션에서 여러 번 눌러도 조회수는 1회만 올린다(자기 자신 인플레이션 방지).
const viewedThisSession = new Set<string>();

/**
 * 카드(기사) 클릭 시 조회수를 +1 한다. fire-and-forget — 실패해도 페이지엔 영향 없음.
 * increment_views RPC / views_count 컬럼이 아직 없으면 콘솔 경고만 남고 무시된다.
 */
export function recordView(articleId: string): void {
  if (viewedThisSession.has(articleId)) return;
  viewedThisSession.add(articleId);

  const supabase = getSupabaseBrowser();
  if (!supabase) return;

  supabase.rpc("increment_views", { p_article_id: articleId }).then(({ error }) => {
    if (error) console.error("[views] increment_views failed:", error.message);
  });
}

// 서버 articles.ts 의 normalizeCategory 와 동일 규칙(구 카테고리는 LLM 로 폴백).
function normalizeCategory(raw: string): Article["category"] {
  return (CATEGORY_SET.has(raw) ? raw : "LLM") as Article["category"];
}

/**
 * 북마크한 기사가 최신 60개 밖으로 밀려난 경우, 그 기사들을 id 로 직접 조회한다.
 * (메인 피드는 여전히 최신 60개만 보여주고, 북마크 보기에서만 합쳐 쓰기 위함)
 */
export async function fetchArticlesByIds(ids: string[]): Promise<Article[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseBrowser();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, url, source, category, summary, thumbnail_url, published_at, likes_count")
    .in("id", ids);

  if (error || !data) {
    if (error) console.error("[articles-client] fetch by ids failed:", error.message);
    return [];
  }

  return data.map((row) => ({
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
}
