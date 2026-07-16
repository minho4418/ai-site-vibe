import { collectStarPool } from "@/lib/github";
import { getSupabaseServiceServer } from "@/lib/supabase-server";
import { kstDateString } from "@/lib/time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// 랭킹 후보 풀 전체의 '오늘(KST) 별 수'를 repo_star_snapshots 에 저장한다.
// GitHub 이 stargazers 목록 API 를 막아서(2026-06-30) 주간 상승은 이 스냅샷의
// 날짜 간 차이로 계산한다(github.ts applyWeeklyFromSnapshots). GitHub Actions
// 가 ingest 직후 매일 호출. (repo, snapshot_date) PK upsert 라 재실행 멱등.
const RETENTION_DAYS = 35; // 주간 계산엔 7일이면 충분 — 월간 확장 여지로 여유를 둔다.

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

  const pool = await collectStarPool();
  if (pool.length === 0) {
    // GitHub 쪽 장애/한도로 후보가 비면 아무것도 덮어쓰지 않고 실패로 보고한다.
    return Response.json({ error: "candidate pool is empty (GitHub API failure?)" }, { status: 502 });
  }

  const today = kstDateString();
  const rows = pool.map(({ repo, stars }) => ({ repo, snapshot_date: today, stars }));
  const { error: upsertError } = await supabase
    .from("repo_star_snapshots")
    .upsert(rows, { onConflict: "repo,snapshot_date" });
  if (upsertError) {
    return Response.json({ error: `snapshot upsert 실패: ${upsertError.message}` }, { status: 500 });
  }

  // 보관 기간 밖 스냅샷 정리(테이블 크기 상시 고정).
  const cutoff = kstDateString(Date.now() - RETENTION_DAYS * 86_400_000);
  const { data: pruned, error: pruneError } = await supabase
    .from("repo_star_snapshots")
    .delete()
    .lt("snapshot_date", cutoff)
    .select("repo");

  return Response.json({
    ok: true,
    ran_at: new Date().toISOString(),
    snapshot_date: today,
    snapshotted: rows.length,
    pruned: pruneError ? `정리 실패: ${pruneError.message}` : (pruned?.length ?? 0),
  });
}
