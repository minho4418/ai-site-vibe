import "server-only";

import type { Briefing, BriefingItem } from "./briefing-types";
import { SITE_URL } from "./site";

// 오늘의 브리핑을 Threads(Meta) 에 "스레드 체인"으로 자동 게시한다(공식 Threads Graph API).
//  - 환경변수 THREADS_ACCESS_TOKEN + THREADS_USER_ID 가 있을 때만 동작(없으면 skip).
//  - 구조: ① 훅(맨 위, 링크 없음 → 도달 극대화) → ② 뉴스마다 1글씩 이어달기(reply_to_id),
//          각 글은 "제목+요약 본문 + 해당 뉴스 링크" → ③ 마지막 글에 전체 브리핑 링크.
//  - 각 글은 2단계(컨테이너 생성 → publish). 다음 글은 직전 글에 reply_to_id 로 이어 붙인다.
//  - 토큰(60일)은 발급·갱신이 필요하며 GitHub Secret/Vercel env 에 보관한다.

const GRAPH = "https://graph.threads.net/v1.0";
const MAX_LEN = 500; // Threads 텍스트 글자 제한.
const MAX_ITEMS = 8; // 체인이 너무 길지 않게 뉴스 항목 상한.

const KEYCAPS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
function numberLabel(i: number): string {
  return KEYCAPS[i] ?? `${i + 1}.`;
}

function clamp(s: string): string {
  return s.length > MAX_LEN ? `${s.slice(0, MAX_LEN - 1).trimEnd()}…` : s;
}

// 맨 위 훅(링크 없음). 루틴이 socialHook 을 주면 그대로, 없으면 캐주얼 기본 훅.
function buildHook(b: Briefing): string {
  if (b.socialHook) return clamp(b.socialHook);
  const [, mm, dd] = b.date.split("-");
  const title = b.title ?? "오늘의 AI·개발 브리핑";
  return clamp(`${Number(mm)}/${Number(dd)} 오늘 AI 뉴스 중 이건 챙겨가자 🧵\n${title}`);
}

// 뉴스 1글: "제목+요약 본문" 뒤에 해당 뉴스 링크(없으면 출처 이름). 캐주얼 버전(social)이 있으면
// 본문 대신 사용. 링크가 500자 제한에 잘리지 않도록 본문을 먼저 줄인 뒤 링크를 붙인다.
function buildItem(item: BriefingItem, i: number): string {
  const head = `${numberLabel(i)} `;
  const tail = item.url ? `\n${item.url}` : item.source ? `\n↳ ${item.source}` : "";
  let body = item.social ? item.social : item.text;
  const room = MAX_LEN - head.length - tail.length;
  if (body.length > room) body = `${body.slice(0, room - 1).trimEnd()}…`;
  return `${head}${body}${tail}`;
}

function buildLinkPost(b: Briefing): string {
  return clamp(`더 자세한 건 여기 다 정리해둠 👇\n${SITE_URL}/daily/${b.date}`);
}

export type ThreadsResult =
  | { skipped: true; reason: string }
  | { posted: true; id: string; count: number; warning?: string }
  | { error: string };

async function postJson(url: string): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(15000) });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 컨테이너 처리 상태(EXPIRED·ERROR·FINISHED·IN_PROGRESS·PUBLISHED). 생성 직후엔 IN_PROGRESS.
async function getStatus(creationId: string, tok: string): Promise<string> {
  const res = await fetch(`${GRAPH}/${creationId}?fields=status&access_token=${tok}`, {
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return typeof json.status === "string" ? json.status : "";
}

// 컨테이너가 publish 가능한 상태(FINISHED)가 될 때까지 폴링. 생성 직후 바로 publish 하면
// Threads 가 "Media Not Found"(code 24)를 던지므로 반드시 대기해야 한다(Meta 권장).
async function waitReady(creationId: string, tok: string): Promise<void> {
  for (let i = 0; i < 15; i++) {
    const status = await getStatus(creationId, tok);
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") throw new Error(`container ${status}`);
    await sleep(2000);
  }
  // FINISHED 를 못 봤어도 마지막으로 publish 를 시도해본다(상태 조회가 막혔을 수 있음).
}

// 글 1개 = 컨테이너 생성 → 준비될 때까지 대기 → publish. replyToId 가 있으면 그 글에 이어 붙인다.
// 게시된 미디어 ID 반환.
async function publishOne(userId: string, tok: string, text: string, replyToId?: string): Promise<string> {
  const reply = replyToId ? `&reply_to_id=${encodeURIComponent(replyToId)}` : "";
  const create = await postJson(
    `${GRAPH}/${userId}/threads?media_type=TEXT&text=${encodeURIComponent(text)}${reply}&access_token=${tok}`,
  );
  const creationId = create.json.id;
  if (!create.ok || typeof creationId !== "string") {
    throw new Error(`container create failed (${create.status}): ${JSON.stringify(create.json)}`);
  }

  await waitReady(creationId, tok);

  const publish = await postJson(
    `${GRAPH}/${userId}/threads_publish?creation_id=${encodeURIComponent(creationId)}&access_token=${tok}`,
  );
  const mediaId = publish.json.id;
  if (!publish.ok || typeof mediaId !== "string") {
    throw new Error(`publish failed (${publish.status}): ${JSON.stringify(publish.json)}`);
  }
  return mediaId;
}

/**
 * 브리핑 1건을 Threads 스레드 체인으로 게시. 토큰 미설정이면 skip.
 * 훅 게시에 성공하면 posted(루트 글 id 반환)로 보고하고, 이후 체인 일부가 실패하면 warning 에 담는다
 * (멱등 키는 루트 글 id 이므로 부분 성공이라도 중복 재게시는 일어나지 않는다).
 */
export async function postBriefingToThreads(briefing: Briefing): Promise<ThreadsResult> {
  const token = process.env.THREADS_ACCESS_TOKEN;
  const userId = process.env.THREADS_USER_ID;
  if (!token || !userId) {
    return { skipped: true, reason: "THREADS_ACCESS_TOKEN/THREADS_USER_ID not set" };
  }
  const tok = encodeURIComponent(token);
  const items = briefing.sections.flatMap((s) => s.items).slice(0, MAX_ITEMS);

  let rootId: string;
  try {
    rootId = await publishOne(userId, tok, buildHook(briefing));
  } catch (e) {
    return { error: (e as Error).message };
  }

  // 훅 이후의 체인: 각 글을 직전 글에 이어 붙인다. 실패해도 루트는 이미 게시됨 → warning 으로만.
  let lastId = rootId;
  try {
    for (let i = 0; i < items.length; i++) {
      lastId = await publishOne(userId, tok, buildItem(items[i], i), lastId);
    }
    await publishOne(userId, tok, buildLinkPost(briefing), lastId);
  } catch (e) {
    return { posted: true, id: rootId, count: items.length, warning: `chain incomplete: ${(e as Error).message}` };
  }

  return { posted: true, id: rootId, count: items.length };
}
