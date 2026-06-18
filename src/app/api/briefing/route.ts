import { parseBriefing } from "@/lib/briefing-types";
import { getSupabaseServiceServer } from "@/lib/supabase-server";
import { postBriefingToThreads, type ThreadsResult } from "@/lib/threads";

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

  // 발행 성공 후 Threads 자동 게시. 토큰이 설정돼 있고 예시(sample)가 아닐 때만,
  // 그리고 같은 날짜를 아직 안 올렸을 때만(멱등). 실패해도 발행 자체는 성공으로 둔다.
  let threads: ThreadsResult = { skipped: true, reason: "disabled" };
  if (process.env.THREADS_ACCESS_TOKEN && process.env.THREADS_USER_ID && !briefing.sample) {
    try {
      const { data: existing } = await supabase
        .from("daily_briefings")
        .select("threads_post_id")
        .eq("date", briefing.date)
        .maybeSingle();
      if (existing?.threads_post_id) {
        threads = { skipped: true, reason: "already posted" };
      } else {
        threads = await postBriefingToThreads(briefing);
        if ("posted" in threads) {
          await supabase
            .from("daily_briefings")
            .update({ threads_post_id: threads.id })
            .eq("date", briefing.date);
        }
      }
    } catch (e) {
      threads = { error: (e as Error).message };
    }
  }

  return Response.json({
    ok: true,
    date: briefing.date,
    sections: briefing.sections.length,
    items: briefing.sections.reduce((n, s) => n + s.items.length, 0),
    threads,
  });
}
