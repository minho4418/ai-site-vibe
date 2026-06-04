import { getSupabaseServiceServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// 30일 이상 지난 글 중 '북마크되지 않은' 글을 삭제한다.
// bookmarks / likes 테이블은 articles 를 on delete cascade 로 참조하므로,
// 삭제된 비북마크 글의 likes 행은 자동 정리된다(북마크 글은 애초에 삭제 대상에서 제외).
const RETENTION_DAYS = 30;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!expected) {
    return Response.json({ error: "CRON_SECRET env var is not configured." }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let supabase;
  try {
    supabase = getSupabaseServiceServer();
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 보존할(=삭제 제외) 북마크된 기사 id 목록.
  const { data: bookmarked, error: bmError } = await supabase.from("bookmarks").select("article_id");
  if (bmError) {
    return Response.json({ error: `bookmarks 조회 실패: ${bmError.message}` }, { status: 500 });
  }
  const keepIds = [...new Set((bookmarked ?? []).map((r) => String(r.article_id)))];

  // published_at 이 cutoff 이전 + 북마크 목록에 없는 글 삭제. (.select 로 삭제된 행을 받아 개수 집계)
  let query = supabase.from("articles").delete().lt("published_at", cutoff);
  if (keepIds.length > 0) {
    query = query.not("id", "in", `(${keepIds.join(",")})`);
  }
  const { data: deleted, error } = await query.select("id");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    ran_at: new Date().toISOString(),
    retention_days: RETENTION_DAYS,
    cutoff,
    bookmarked_kept: keepIds.length,
    deleted: deleted?.length ?? 0,
  });
}
