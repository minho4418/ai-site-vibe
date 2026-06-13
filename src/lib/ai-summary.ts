import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// 무료 LLM(Groq, OpenAI 호환 API)으로 RSS 제목+요약을 한국어 한두 문장으로 다듬는다.
// - 영문 기사(OpenAI/TechCrunch/Verge/HN)는 자연스러운 한국어로 번역 요약 → 타겟(한국 개발자)에 핵심 가치.
// - 본문 fetch 없이 이미 수집한 RSS 텍스트만 입력 → 빠르고 안정적, Google News 리다이렉트 기사도 커버.
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
// 70b-versatile 가 한국어 번역·요약 품질이 확연히 좋다(8b 는 영문 기사에서 군더더기/숫자 오류가 잦음).
// 속도·rate limit 가 더 중요하면 GROQ_MODEL=llama-3.1-8b-instant 로 교체 가능.
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

// 실측으로 다듬은 프롬프트: 느슨하면 모델이 영어로 장황하게 답하므로 "한국어만/영어 금지/머리말 금지"를 강하게 못 박는다.
const SYSTEM_PROMPT =
  "너는 한국 개발자용 AI 뉴스 큐레이션 사이트의 요약 기자다. " +
  "기사 제목과 원문 발췌를 보고 카드에 들어갈 한국어 요약문 1~2문장만 출력한다. " +
  "반드시 한국어로만 쓴다(영문 기사는 자연스러운 한국어로 번역). " +
  "머리말·설명·따옴표·영어 금지. '이 기사는'·'요약하면' 같은 군더더기 없이 핵심 사실부터 바로 쓴다. " +
  "무엇이 일어났고 왜 중요한지 담되 과장/광고체 금지, 차분한 정보체. 최대 110자. " +
  // 저작권 안전: 원문 표현을 그대로 옮기면 2차적저작물(요약물) 침해 소지 → 사실만 추려 재서술하도록 강제.
  "원문 문장을 그대로 베끼거나 길게 인용하지 말고, 사실만 추려 너의 표현으로 새로 쓴다.";

export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

type SummaryInput = { title: string; summary: string | null };

/** Groq 로 기사 1건을 한국어 요약. 실패(키 없음·네트워크·rate limit)하면 null → 호출부에서 건너뛴다. */
export async function summarizeArticle(
  input: SummaryInput,
  timeoutMs = 12_000,
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const source = `${input.title}\n\n${input.summary ?? ""}`.trim();
  if (source.length < 12) return null; // 입력이 너무 빈약하면 요약 의미 없음 → RSS 요약 폴백

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 160,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `제목: ${input.title}\n\n원문 발췌:\n${input.summary ?? "(없음)"}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    // 모델이 가끔 감싸는 따옴표/머리말 제거 후 길이 컷.
    const cleaned = text.replace(/^["'“”]+|["'“”]+$/g, "").trim();
    return cleaned.length > 140 ? cleaned.slice(0, 139).trimEnd() + "…" : cleaned;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── 카드용 요약 + 커버 키워드(한 번의 Groq 호출로 둘 다) ──
// summarizeArticle 과 같은 입력(제목+RSS 발췌)이지만, 썸네일 없는 카드 커버에 큰 글씨로 박을
// 핵심 키워드까지 JSON 으로 함께 받아 추가 호출 없이 한 번에 처리한다.

export type CardSummary = { summary: string; keywords: string[] };

const CARD_SYSTEM_PROMPT =
  "너는 한국 개발자용 AI 뉴스 큐레이션 사이트의 요약 기자다. " +
  '기사 제목과 원문 발췌를 보고 JSON 으로만 답한다. 형식: {"summary": string, "keywords": string[]}. ' +
  "summary: 카드용 한국어 요약 1~2문장(최대 110자). 반드시 한국어(영문 기사는 자연스러운 한국어로 번역). " +
  "머리말·따옴표·영어·과장/광고체 금지, 핵심 사실부터 바로. " +
  "keywords: 썸네일 표지에 큰 글씨로 박을 핵심어 2~3개. 각 1~3어절·최대 12자, 한국어 명사 위주" +
  "(제품명·고유명사는 원형 유지, 예: GPT-5/Claude Code). 문장·해시태그·중복 금지. " +
  // 저작권 안전: 원문 표현을 그대로 옮기지 말고 사실만 추려 재서술.
  "원문 문장을 그대로 베끼지 말고 사실만 추려 너의 표현으로 새로 쓴다. JSON 외 출력 금지.";

/** Groq 로 카드 요약 + 커버 키워드를 한 번에 생성. 실패하면 null → 호출부에서 건너뛴다. */
export async function summarizeForCard(
  input: SummaryInput,
  timeoutMs = 12_000,
): Promise<CardSummary | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const source = `${input.title}\n\n${input.summary ?? ""}`.trim();
  if (source.length < 12) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 280,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CARD_SYSTEM_PROMPT },
          { role: "user", content: `제목: ${input.title}\n\n원문 발췌:\n${input.summary ?? "(없음)"}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { summary?: unknown; keywords?: unknown };
    let summary = typeof parsed.summary === "string" ? parsed.summary.replace(/^["'“”]+|["'“”]+$/g, "").trim() : "";
    if (summary.length > 140) summary = summary.slice(0, 139).trimEnd() + "…";
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .filter((k): k is string => typeof k === "string")
          .map((k) => k.trim().replace(/^#+/, "").trim())
          .filter((k, i, arr) => k.length > 0 && k.length <= 16 && arr.indexOf(k) === i)
          .slice(0, 3)
      : [];
    if (!summary) return null;
    return { summary, keywords };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── 상세 요약(모달용): 기사 본문 전체를 받아 한 줄 요약 + 핵심 포인트 불릿으로 구조화 ──

export type DetailSummary = {
  tldr: string;
  points: string[];
};

const DETAIL_SYSTEM_PROMPT =
  "너는 한국 개발자용 AI 뉴스 큐레이션 사이트의 요약 기자다. " +
  "기사 제목과 본문을 읽고 JSON 으로만 답한다. 형식: {\"tldr\": string, \"points\": string[]}. " +
  "tldr: 기사를 한 문장으로 요약(한국어, 최대 80자). " +
  "points: 핵심 내용을 3~5개의 한국어 불릿으로 정리(각 항목 최대 100자, 사실 위주, 군더더기·머리말 없이). " +
  "반드시 한국어로만 쓴다(영문 기사는 한국어로 번역). 과장/광고체 금지, 차분한 정보체. JSON 외 다른 텍스트 출력 금지. " +
  // 저작권 안전: 본문 문장을 그대로 복사·인용하지 말고 사실을 재서술(transformative)하도록 강제.
  "본문 문장을 그대로 복사·인용하지 말고, 핵심 사실을 너의 표현으로 바꿔 쓴다.";

/** 본문 텍스트로 상세 요약(tldr+points) 생성. 실패하면 null → 호출부에서 unavailable 처리. */
export async function generateDetailSummary(
  title: string,
  body: string,
  timeoutMs = 18_000,
): Promise<DetailSummary | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || body.trim().length < 200) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // 상세 요약은 본문 전체(~2.5k 토큰/건)를 넣어 온디맨드로 자주 호출되므로,
        // 일일 토큰 한도가 넉넉한 8b-instant 를 기본으로 쓴다(카드 요약 cron 의 70b 와 분리).
        model: process.env.GROQ_DETAIL_MODEL || "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 900,
        // Groq(OpenAI 호환)의 JSON 모드 — 파싱 실패를 줄인다.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: DETAIL_SYSTEM_PROMPT },
          { role: "user", content: `제목: ${title}\n\n본문:\n${body}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { tldr?: unknown; points?: unknown };
    const tldr = typeof parsed.tldr === "string" ? parsed.tldr.trim() : "";
    const points = Array.isArray(parsed.points)
      ? parsed.points.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim())
      : [];
    if (!tldr || points.length === 0) return null;
    return { tldr, points: points.slice(0, 6) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type ArticleRow = { id: string; title: string; summary: string | null };

/**
 * DB 에서 ai_summary 또는 keywords 가 비어있는 최신 기사들을 budget 만큼 가져와
 * Groq 한 번 호출로 요약 + 커버 키워드를 함께 채운다(개별 UPDATE).
 * - 메인 upsert 와 분리되어 있어 기사 재수집 시 기존 값을 null 로 덮어쓰지 않는다.
 * - 같은 함수가 cron 보강 + 과거 기사 백필 두 역할을 모두 한다(반복 호출하면 점진적으로 채워짐).
 * - 키워드가 안 뽑히면 빈 배열로 저장 → 다음 실행에서 재처리하지 않음(커버는 소스명으로 폴백).
 * @returns 이번 호출에서 새로 처리한 기사 수
 */
export async function enrichSummaries(
  // 서비스 롤 클라이언트(쓰기 권한). 타입은 느슨하게 받아 lib 의존을 줄인다.
  supabase: SupabaseClient,
  budget = 30,
  concurrency = 4,
): Promise<number> {
  if (!groqConfigured() || budget <= 0) return 0;

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, summary")
    // ai_summary 가 비었거나(신규) keywords 가 비었으면(키워드 기능 도입 전 과거글) 대상.
    .or("ai_summary.is.null,keywords.is.null")
    .order("published_at", { ascending: false })
    .limit(budget);

  if (error || !data || data.length === 0) return 0;

  const targets = data as ArticleRow[];
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < targets.length) {
      const row = targets[cursor++];
      const result = await summarizeForCard({ title: row.title, summary: row.summary });
      if (!result) continue;
      const { error: upErr } = await supabase
        .from("articles")
        .update({ ai_summary: result.summary, keywords: result.keywords })
        .eq("id", row.id);
      if (!upErr) done++;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
  return done;
}
