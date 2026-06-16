// 오늘의 브리핑 타입 + 순수 검증 로직(서버 의존 없음).
//  - 읽기 경로(briefings.ts, 서버)와 발행 엔드포인트(/api/briefing)가 함께 쓴다.
//  - 클라이언트 컴포넌트(DailyHero 등)는 여기서 타입만 import.

export type BriefingItem = { text: string; url?: string; source?: string };
export type BriefingSection = { heading: string; items: BriefingItem[] };
export type Briefing = {
  date: string; // "YYYY-MM-DD"
  title?: string;
  summary?: string;
  sections: BriefingSection[];
  pick?: BriefingItem | null; // 오늘의 한 줄 추천
  sample?: boolean; // 시드/예시 브리핑이면 true → 화면에 '예시' 배지
};

/** 아카이브 목록용 경량 메타(섹션 본문 제외). */
export type BriefingMeta = Pick<Briefing, "date" | "title" | "summary" | "sample">;

export const BRIEFING_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// 제목 끝의 "— …데일리 브리핑" 류 보일러플레이트 접미사를 제거한다.
// 사이트가 날짜를 따로 표시하므로 "헤드라인 — 2026년 6월 16일 AI·개발자 데일리 브리핑"
// 같은 중복 꼬리표를 떼어 핵심 헤드라인만 남긴다. 구분자(—–-|) 뒤가 "…브리핑"으로 끝날 때만.
function cleanTitle(raw: string): string {
  return raw.replace(/\s*[—–\-|]\s*[^—–\-|]*브리핑\s*$/u, "").trim();
}

function parseItem(raw: unknown): BriefingItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const text = asString(o.text);
  if (!text) return null;
  const item: BriefingItem = { text };
  const url = asString(o.url);
  // http(s) 절대경로 또는 사이트 내부 경로(/...)만 허용 — javascript: 등 위험 스킴 차단.
  if (/^https?:\/\//i.test(url) || url.startsWith("/")) item.url = url;
  const source = asString(o.source);
  if (source) item.source = source;
  return item;
}

/**
 * 임의 입력(JSONB payload·POST body)을 안전한 Briefing 으로 검증·정규화.
 * 형식이 깨졌거나 유효 섹션이 0개면 null → 호출부에서 건너뛴다(깨진 데이터가 렌더를 막지 않게).
 */
export function parseBriefing(raw: unknown, fallbackDate?: string): Briefing | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const date = BRIEFING_DATE_RE.test(asString(o.date))
    ? asString(o.date)
    : (fallbackDate ?? "");
  if (!BRIEFING_DATE_RE.test(date)) return null;

  const sectionsRaw = Array.isArray(o.sections) ? o.sections : [];
  const sections: BriefingSection[] = [];
  for (const s of sectionsRaw) {
    if (!s || typeof s !== "object") continue;
    const so = s as Record<string, unknown>;
    const heading = asString(so.heading);
    const items = (Array.isArray(so.items) ? so.items : [])
      .map(parseItem)
      .filter((i): i is BriefingItem => i !== null);
    if (heading && items.length > 0) sections.push({ heading, items });
  }
  if (sections.length === 0) return null;

  return {
    date,
    title: cleanTitle(asString(o.title)) || undefined,
    summary: asString(o.summary) || undefined,
    sections,
    pick: parseItem(o.pick),
    sample: o.sample === true,
  };
}
