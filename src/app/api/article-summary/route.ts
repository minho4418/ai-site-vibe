import { generateDetailSummary, groqConfigured } from "@/lib/ai-summary";
import { fetchArticleBody } from "@/lib/article-body";
import type { Json } from "@/lib/database.types";
import { getSupabaseServiceServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// 카드의 "✦ AI 요약" 클릭 시 호출. 기사 본문을 가져와 상세 요약(tldr+points)을 만들어 돌려준다.
// - 결과는 articles.detail_summary(JSONB)에 캐시 → 다음 사람은 LLM 호출 없이 바로 받음.
// - Google News 리다이렉트/본문 실패는 캐시하지 않고 unavailable 로 응답(나중에 재시도 여지).
// - 비용 보호: 유효한 기사 id 만 생성하고 한 번 만들면 캐시되므로 호출량이 기사 수로 바운드됨.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ status: "error", message: "id 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getSupabaseServiceServer();
  } catch (err) {
    return Response.json({ status: "error", message: (err as Error).message }, { status: 500 });
  }

  const { data: article, error } = await supabase
    .from("articles")
    .select("id, title, url, detail_summary")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return Response.json({ status: "error", message: error.message }, { status: 500 });
  }
  if (!article) {
    return Response.json({ status: "error", message: "기사를 찾을 수 없습니다." }, { status: 404 });
  }

  // 이미 캐시된 상세 요약이 있으면 그대로 반환(LLM 호출 없음).
  const cached = article.detail_summary as { tldr?: string; points?: string[] } | null;
  if (cached && typeof cached.tldr === "string" && Array.isArray(cached.points)) {
    return Response.json({ status: "ok", summary: cached, cached: true });
  }

  if (!groqConfigured()) {
    return Response.json({ status: "unavailable", reason: "no_api_key" });
  }

  // 본문 가져오기(Google News 등은 null) → 상세 요약 생성.
  const body = await fetchArticleBody(article.url);
  if (!body) {
    return Response.json({ status: "unavailable", reason: "no_body" });
  }

  const summary = await generateDetailSummary(article.title, body);
  if (!summary) {
    return Response.json({ status: "unavailable", reason: "gen_failed" });
  }

  // 캐시 저장(실패해도 응답엔 영향 없음). detail_summary 는 jsonb 컬럼(Json) 이라 직렬화 가능한 객체로 캐스팅.
  await supabase
    .from("articles")
    .update({ detail_summary: summary as unknown as Json })
    .eq("id", id);

  return Response.json({ status: "ok", summary, cached: false });
}
