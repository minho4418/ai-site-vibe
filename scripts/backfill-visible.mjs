// 일회용: 홈에 "현재 보이는 80개 카드" 중 썸네일 없고 키워드 없는 것만 Groq 로 채운다.
// 홈 선정(getArticles)과 동일하게 최신순 200 → 소스당 5개 cap → 80개를 재현한다.
// 실행: node scripts/backfill-visible.mjs   (.env.local 자동 로드)
import { readFileSync } from "node:fs";

// .env.local 로드
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GK = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const H = { apikey: K, Authorization: `Bearer ${K}` };

const CARD_SYSTEM_PROMPT =
  "너는 한국 개발자용 AI 뉴스 큐레이션 사이트의 요약 기자다. " +
  '기사 제목과 원문 발췌를 보고 JSON 으로만 답한다. 형식: {"summary": string, "keywords": string[]}. ' +
  "summary: 카드용 한국어 요약 1~2문장(최대 110자). 반드시 한국어(영문 기사는 자연스러운 한국어로 번역). " +
  "머리말·따옴표·영어·과장/광고체 금지, 핵심 사실부터 바로. " +
  "keywords: 썸네일 표지에 큰 글씨로 박을 핵심어 2~3개. 각 1~3어절·최대 12자, 한국어 명사 위주" +
  "(제품명·고유명사는 원형 유지, 예: GPT-5/Claude Code). 문장·해시태그·중복 금지. " +
  "원문 문장을 그대로 베끼지 말고 사실만 추려 너의 표현으로 새로 쓴다. JSON 외 출력 금지.";

function capPerSource(sorted, FEED = 80, MAX = 5) {
  const picked = [], overflow = [], counts = new Map();
  for (const a of sorted) {
    if (picked.length >= FEED) break;
    const n = counts.get(a.source) ?? 0;
    if (n < MAX) { picked.push(a); counts.set(a.source, n + 1); }
    else overflow.push(a);
  }
  for (const a of overflow) { if (picked.length >= FEED) break; picked.push(a); }
  return picked;
}

async function summarizeForCard(title, summary) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GK}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL, temperature: 0.3, max_tokens: 280,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CARD_SYSTEM_PROMPT },
        { role: "user", content: `제목: ${title}\n\n원문 발췌:\n${summary ?? "(없음)"}` },
      ],
    }),
  });
  if (res.status === 429) return "RATE";
  if (!res.ok) return null;
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  let s = typeof parsed.summary === "string" ? parsed.summary.replace(/^["'“”]+|["'“”]+$/g, "").trim() : "";
  if (s.length > 140) s = s.slice(0, 139).trimEnd() + "…";
  const kw = Array.isArray(parsed.keywords)
    ? parsed.keywords.filter((k) => typeof k === "string").map((k) => k.trim().replace(/^#+/, "").trim())
        .filter((k, i, arr) => k.length > 0 && k.length <= 16 && arr.indexOf(k) === i).slice(0, 3)
    : [];
  if (!s) return null;
  return { summary: s, keywords: kw };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1) 홈 후보 200 → cap → 80
const url = `${U}/rest/v1/articles?select=id,source,thumbnail_url,keywords,title,summary&order=published_at.desc,created_at.desc,id.desc&limit=200`;
const candidates = await (await fetch(url, { headers: H })).json();
const visible = capPerSource(candidates);
const targets = visible.filter((a) => !a.thumbnail_url && (!a.keywords || a.keywords.length === 0));
console.log(`보이는 카드 ${visible.length}개 중 썸네일X·키워드X 대상: ${targets.length}개`);

// 2) 순차 처리(TPM 보호). 429 면 대기 후 재시도.
let done = 0;
for (let i = 0; i < targets.length; i++) {
  const t = targets[i];
  let r = await summarizeForCard(t.title, t.summary);
  if (r === "RATE") { console.log("  …429 rate limit, 30s 대기"); await sleep(30000); r = await summarizeForCard(t.title, t.summary); }
  if (!r || r === "RATE") { console.log(`  [skip] ${t.title.slice(0, 36)}`); await sleep(1200); continue; }
  const up = await fetch(`${U}/rest/v1/articles?id=eq.${t.id}`, {
    method: "PATCH",
    headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ ai_summary: r.summary, keywords: r.keywords }),
  });
  if (up.ok) { done++; console.log(`  [${done}] ${JSON.stringify(r.keywords)}  ← ${t.title.slice(0, 32)}`); }
  await sleep(1500); // ~40 req/min 미만으로 TPM 회피
}
console.log(`\n완료: ${done}/${targets.length} 채움`);
