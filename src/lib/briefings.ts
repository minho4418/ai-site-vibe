import "server-only";

import { getSupabaseAnonServer } from "./supabase-server";
import { parseBriefing, type Briefing, type BriefingMeta } from "./briefing-types";

// 오늘의 브리핑은 Supabase `daily_briefings` 테이블에 저장된다.
//  - 클라우드 "데일리 브리핑" 루틴이 매일 리서치 후 /api/briefing 으로 POST → 서비스키로 upsert.
//  - 사이트는 anon 키로 read. 읽기는 전부 방어적(parseBriefing): 깨진 payload 1건이 렌더를 막지 않게 한다.
//  - payload(jsonb) 에 Briefing 객체 전체가 들어 있고, date 컬럼은 정렬·조회용 키다.

export type { Briefing, BriefingItem, BriefingSection, BriefingMeta } from "./briefing-types";

/** 가장 최근의 유효한 브리핑. 없거나 미설정이면 null. */
export async function getLatestBriefing(): Promise<Briefing | null> {
  const supabase = getSupabaseAnonServer();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("daily_briefings")
    .select("date, payload")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return parseBriefing(data.payload, data.date);
}

export async function getBriefing(date: string): Promise<Briefing | null> {
  const supabase = getSupabaseAnonServer();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("daily_briefings")
    .select("date, payload")
    .eq("date", date)
    .maybeSingle();
  if (error || !data) return null;
  return parseBriefing(data.payload, data.date);
}

/** 아카이브 목록(최신순, 본문 제외). 깨진 행은 자동 제외. */
export async function listBriefings(limit = 90): Promise<BriefingMeta[]> {
  const supabase = getSupabaseAnonServer();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("daily_briefings")
    .select("date, payload")
    .order("date", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data
    .map((row) => parseBriefing(row.payload, row.date))
    .filter((b): b is Briefing => b !== null)
    .map(({ date, title, summary, sample }) => ({ date, title, summary, sample }));
}
