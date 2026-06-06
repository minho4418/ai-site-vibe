// 기존에 썸네일이 없는 직링크 기사들의 thumbnail_url 을 og:image 로 1회 백필한다.
// 실행: node --env-file=.env.local scripts/backfill-og.mjs
// (Google News 리다이렉트 URL 은 og:image 가 전부 동일한 로고라 건너뛴다.)

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !SERVICE) {
  console.error("환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const OG_PATTERNS = [
  /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
];

const isGoogleNews = (u) => {
  try {
    return new URL(u).hostname === "news.google.com";
  } catch {
    return true;
  }
};

async function fetchOg(pageUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ai-news-bot/1.0)" },
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    const html = (await res.text()).slice(0, 250_000);
    for (const re of OG_PATTERNS) {
      const m = html.match(re);
      if (m?.[1]) {
        try {
          return new URL(m[1], pageUrl).toString();
        } catch {
          return m[1];
        }
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const headers = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
};

// 1) 썸네일 없는 기사 전부 가져오기
const rows = await fetch(
  `${URL_BASE}/rest/v1/articles?select=id,url&thumbnail_url=is.null&limit=2000`,
  { headers },
).then((r) => r.json());

const targets = rows.filter((r) => !isGoogleNews(r.url));
console.log(`썸네일 없는 기사 ${rows.length}개 중 직링크 ${targets.length}개 대상(구글뉴스 ${rows.length - targets.length}개 제외)`);

let done = 0;
let filled = 0;
let cursor = 0;

async function worker() {
  while (cursor < targets.length) {
    const row = targets[cursor++];
    const og = await fetchOg(row.url);
    done++;
    if (og) {
      const res = await fetch(`${URL_BASE}/rest/v1/articles?id=eq.${row.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ thumbnail_url: og }),
      });
      if (res.ok) filled++;
      else console.warn(`PATCH 실패 ${row.id}: ${res.status}`);
    }
    if (done % 20 === 0) console.log(`  진행 ${done}/${targets.length} (채움 ${filled})`);
  }
}

await Promise.all(Array.from({ length: 12 }, worker));
console.log(`\n완료: 직링크 ${targets.length}개 중 ${filled}개에 og:image 채움.`);
