import { parseBriefing } from "@/lib/briefing-types";
import { getSupabaseServiceServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 오늘의 브리핑 발행 엔드포인트. 클라우드 "데일리 브리핑" 루틴이 리서치 결과(JSON)를
// 여기로 POST 하면 서비스 롤로 daily_briefings 에 upsert 한다.
// 루틴 샌드박스엔 Supabase 키가 없으므로, 전용 Bearer 토큰 BRIEFING_TOKEN 으로 인증한다
// (ingest 의 CRON_SECRET 과 분리 → 노출돼도 '브리핑 발행'으로만 영향 제한).
export async function POST(request: Request) {
  const expected = process.env.BRIEFING_TOKEN;
  if (!expected) {
    return Response.json({ error: "BRIEFING_TOKEN env var is not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // 발행 전 검증·정규화. 형식이 깨졌거나 유효 섹션이 0개면 거부(쓰레기 데이터 저장 방지).
  const briefing = parseBriefing(raw);
  if (!briefing) {
    return Response.json(
      { error: "Invalid briefing: date(YYYY-MM-DD) and at least one non-empty section required." },
      { status: 422 },
    );
  }

  let supabase;
  try {
    supabase = getSupabaseServiceServer();
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }

  const { error } = await supabase
    .from("daily_briefings")
    .upsert(
      { date: briefing.date, payload: briefing, updated_at: new Date().toISOString() },
      { onConflict: "date" },
    );
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    date: briefing.date,
    sections: briefing.sections.length,
    items: briefing.sections.reduce((n, s) => n + s.items.length, 0),
  });
}
