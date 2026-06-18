// 오늘의 브리핑 타입 + 순수 검증 로직(서버 의존 없음).
//  - 읽기 경로(briefings.ts, 서버)와 발행 엔드포인트(/api/briefing)가 함께 쓴다.
//  - 클라이언트 컴포넌트(DailyHero 등)는 여기서 타입만 import.

export type BriefingItem = {
  text: string;
  url?: string;
  source?: string;
  social?: string; // (선택) 소셜용 캐주얼 한 줄. 없으면 text 를 줄여서 사용.
};
export type BriefingSection = { heading: string; items: BriefingItem[] };
export type Briefing = {
  date: string; // "YYYY-MM-DD"
  title?: string;
  summary?: string;
  sections: BriefingSection[];
  pick?: BriefingItem | null; // 오늘의 한 줄 추천
  sample?: boolean; // 시드/예시 브리핑이면 true → 화면에 '예시' 배지
  socialHook?: string; // (선택) 쓰레드 체인 맨 위 훅 문구. 없으면 기본 훅 사용.
};

/** 아카이브 목록용 경량 메타(섹션 본문 제외). */
export type BriefingMeta = Pick<Briefing, "date" | "title" | "summary" | "sample">;

export const BRIEFING_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 깨진 문자열의 강한 신호: 유니코드 대체문자(U+FFFD)·Specials 블록(U+FFF9–FFFF)·
// 고립 서로게이트(U+D800–DFFF). 정상 콘텐츠엔 절대 나오지 않으므로 고정밀로 손상을 판별한다.
// (루틴이 긴 한글 JSON 을 한 번에 생성하다 끝부분에서 바이트가 깨질 때 나타난다.)
// 주의: '맊'(만)처럼 유효하지만 틀린 한글 오타는 여기서 못 거른다 — 그건 루틴 측에서만 고칠 수 있다.
const CORRUPTION_RE = /[\uFFF9-\uFFFF\uD800-\uDFFF]/u;
// 표시에 무의미하고 손상의 흔적인 제어문자(C0/C1)는 조용히 제거한다(\t·\n·\r 은 보존).
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu;

function asString(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(CONTROL_RE, "").trim();
}

/** 대체문자 등 명백한 손상 마커가 있으면 true → 표시에서 제외(쓰레기 노출 방지). */
function isCorrupted(s: string): boolean {
  return CORRUPTION_RE.test(s);
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
  // 본문이 비었거나 손상 마커가 섞인 항목은 버린다(깨진 한 줄이 화면에 노출되지 않게).
  if (!text || isCorrupted(text)) return null;
  const item: BriefingItem = { text };
  const url = asString(o.url);
  // http(s) 절대경로 또는 사이트 내부 경로(/...)만 허용 — javascript: 등 위험 스킴 차단.
  if (/^https?:\/\//i.test(url) || url.startsWith("/")) item.url = url;
  const source = asString(o.source);
  // 출처도 손상됐으면 붙이지 않는다(본문은 멀쩡한데 꼬리표만 깨진 경우 대비).
  if (source && !isCorrupted(source)) item.source = source;
  const social = asString(o.social);
  if (social && !isCorrupted(social)) item.social = social;
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
    // 손상된 제목의 섹션은 통째로 건너뛴다(항목이 멀쩡해도 헤딩이 깨지면 신뢰 불가).
    if (heading && !isCorrupted(heading) && items.length > 0) {
      sections.push({ heading, items });
    }
  }
  if (sections.length === 0) return null;

  const title = cleanTitle(asString(o.title));
  const summary = asString(o.summary);
  const socialHook = asString(o.socialHook);
  return {
    date,
    // 제목/요약이 손상됐으면 떨군다 → 뷰가 기본 제목으로 대체(깨진 헤드라인 노출 방지).
    title: title && !isCorrupted(title) ? title : undefined,
    summary: summary && !isCorrupted(summary) ? summary : undefined,
    sections,
    pick: parseItem(o.pick),
    sample: o.sample === true,
    socialHook: socialHook && !isCorrupted(socialHook) ? socialHook : undefined,
  };
}
