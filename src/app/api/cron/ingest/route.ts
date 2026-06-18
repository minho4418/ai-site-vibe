import Parser from "rss-parser";

import { enrichSummaries } from "@/lib/ai-summary";
import type { CategoryId } from "@/lib/categories";
import { classifyCategory, isAiRelated } from "@/lib/categorize";
import { FEEDS } from "@/lib/feeds";
import { enrichThumbnails } from "@/lib/og-image";
import { extractSummary, extractThumbnail, normalizeUrl } from "@/lib/rss-extract";
import { getSupabaseServiceServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type FeedResult = {
  source: string;
  fetched?: number;
  // 근접중복 제거 후 이 소스에서 살아남아 저장 대상이 된 수.
  kept?: number;
  error?: string;
};

// rss-parser 가 RSS 2.0 의 pubDate 는 자동으로 isoDate 로 만들어주지만,
// Atom 의 <published>/<updated>, Dublin Core 의 <dc:date> 는 customFields 로 명시해야 가져온다.
const DATE_FIELDS = ["isoDate", "pubDate", "published", "updated", "dc:date", "date"] as const;
type RawItem = Partial<Record<(typeof DATE_FIELDS)[number], string>>;

type ArticleRow = {
  url: string;
  title: string;
  source: string;
  category: Exclude<CategoryId, "all">;
  summary: string;
  thumbnail_url: string | null;
  published_at: string;
  // 누적 DB 전반의 근접중복 식별자. upsert onConflict 대상이라 같은 제목은 실행을 넘나들어도 1건만 유지된다.
  title_key: string;
};

function pickPublishedAt(item: RawItem, ingestStart: number, index: number): string {
  for (const key of DATE_FIELDS) {
    const raw = item[key];
    if (!raw) continue;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  // RSS 가 어떤 시간 필드도 안 주는 경우 — 같은 ingest 안에서 index 만큼 1초씩 과거로 흩뿌려 순서 보존.
  return new Date(ingestStart - index * 1000).toISOString();
}

function isGoogleNewsUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("news.google.com");
  } catch {
    return false;
  }
}

// 근접중복 판별용 제목 키.
// Google News 는 제목에 " - 매체명" 을 붙이므로 그 접미사를 떼고, 영문/숫자/한글만 남겨 소문자화한다.
// → 같은 통신사 기사를 여러 매체가 받아써도(와이어 카피) 한 건으로 묶인다. 같은 사건의 직링크/구글뉴스 중복도 흡수.
function titleKey(title: string, isGoogleNews: boolean): string {
  let t = title;
  if (isGoogleNews) t = t.replace(/\s+[-–—|]\s+[^-–—|]+$/, "");
  return t
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "")
    .slice(0, 64);
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!expected) {
    return Response.json(
      { error: "CRON_SECRET env var is not configured." },
      { status: 500 },
    );
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

  const parser = new Parser({
    timeout: 12_000,
    customFields: {
      // Atom / Dublin Core 시간 필드를 명시적으로 파싱해서 item.published, item.updated, item['dc:date'] 로 노출.
      item: ["published", "updated", "dc:date", "date"],
    },
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ai-news-bot/1.0; +https://github.com/your-handle/ai-news)",
      // 일부 매체(예: 네이버 D2)는 rss-parser 기본 Accept 를 406 으로 거부 → RSS 리더 표준 Accept 명시.
      Accept:
        "application/atom+xml, application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
    },
  });

  // 같은 ingest 안에서 시간 정보가 빠진 글들도 RSS 순서를 보존하도록 fallback 의 기준점.
  const ingestStart = Date.now();

  // 1) 모든 피드를 병렬로 가져와 후보 row 를 수집한다.
  //    피드 하나가 죽어도(allSettled) 나머지는 계속 진행. 피드 수가 늘어도 순차 대신 병렬이라 cron 60s 안에 든다.
  const settled = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      const limit = feed.limit ?? 15;
      const rows: ArticleRow[] = parsed.items
        .filter((item) => item.link && item.title)
        .map((item) => ({
          item,
          title: item.title!.trim(),
          summary: extractSummary(item.contentSnippet ?? item.content ?? ""),
        }))
        // 종합 피드(aiOnly)는 AI 관련 글만 남긴다. slice 보다 먼저 걸러야 limit 개를 채운다.
        .filter(({ title, summary }) => !feed.aiOnly || isAiRelated(`${title} ${summary}`))
        // 품질 게이트: 제목이 지나치게 짧은(공백 제외 6자 미만) 항목은 제외(빈/깨진 제목 방지).
        .filter(({ title }) => title.replace(/\s/g, "").length >= 6)
        .slice(0, limit)
        .map(({ item, title, summary }, index) => {
          const url = normalizeUrl(item.link!);
          return {
            url,
            title,
            source: feed.source,
            // forceCategory 면 피드 기본값 고정, 아니면 키워드로 재분류(실패 시 기본값).
            category: feed.forceCategory
              ? feed.category
              : classifyCategory(`${title} ${summary}`) ?? feed.category,
            summary,
            thumbnail_url: extractThumbnail(item),
            // RSS 가 시간을 안 주면 ingest 시작 시점에서 index*1초 만큼 과거로 분산시켜 RSS 순서(최신→오래된)를 보존.
            published_at: pickPublishedAt(item, ingestStart, index),
            // 제목 정규화 키. 빈 키(기호/비라틴 제목 등)는 url 로 폴백해 서로 뭉개지지 않게 한다.
            title_key: titleKey(title, isGoogleNewsUrl(url)) || `url:${url}`,
          };
        });
      return rows;
    }),
  );

  const results: FeedResult[] = [];
  const candidates: ArticleRow[] = [];
  const fetchedBySource = new Map<string, number>();
  settled.forEach((s, i) => {
    const feed = FEEDS[i];
    if (s.status === "fulfilled") {
      fetchedBySource.set(feed.source, s.value.length);
      candidates.push(...s.value);
    } else {
      results.push({ source: feed.source, error: (s.reason as Error).message });
    }
  });

  // 2) 전 피드를 가로질러 근접중복 제거. 같은 title_key 면 직링크를 Google News 보다 우선해 1건만 남긴다.
  //    Map 은 삽입 순서를 보존하므로 먼저 들어온(피드 우선순위 높은) 직링크가 유지된다.
  //    실행 단위 중복은 여기서, 누적 DB 전반의 중복은 onConflict:"title_key" upsert(아래 4단계)가 막는다.
  const seen = new Map<string, ArticleRow>();
  for (const row of candidates) {
    const existing = seen.get(row.title_key);
    if (!existing) {
      seen.set(row.title_key, row);
      continue;
    }
    // 기존이 Google News 이고 새 후보가 직링크면 교체(본문·og:image 가능한 직링크 우선).
    if (isGoogleNewsUrl(existing.url) && !isGoogleNewsUrl(row.url)) {
      seen.set(row.title_key, row);
    }
  }
  const deduped = [...seen.values()];

  const keptBySource = new Map<string, number>();
  for (const row of deduped) {
    keptBySource.set(row.source, (keptBySource.get(row.source) ?? 0) + 1);
  }
  for (const [source, fetched] of fetchedBySource) {
    results.push({ source, fetched, kept: keptBySource.get(source) ?? 0 });
  }

  // 3) RSS 에 이미지가 없는 직링크 기사에 og:image 보강(Google News 는 자동 제외). 전체 dedup 셋에 한 번만.
  const ogBudget = 40;
  await enrichThumbnails(deduped, ogBudget);

  // 4) 단일 upsert. onConflict:"title_key" → 같은 제목이면 url 이 달라도(직링크↔구글뉴스, 매체간 와이어 카피)
  //    DB 의 기존 1건을 갱신해 누적 중복을 원천 차단. (title_key UNIQUE 인덱스 필요 — migrations/002 참고.)
  //    articles.likes_count / ai_summary 는 rows 에 없으므로 기존 값이 유지된다.
  let totalUpserted = 0;
  // upsert 실패는 "한 건도 저장 못 함"이라 치명적 → 아래에서 HTTP 500 으로 반환해
  // 워크플로가 빨간불로 즉시 알린다. (개별 피드/요약 실패는 부분적이라 200 유지.)
  let upsertFailed = false;
  if (deduped.length > 0) {
    const { error, count } = await supabase
      .from("articles")
      .upsert(deduped, { onConflict: "title_key", count: "exact" });
    if (error) {
      results.push({ source: "upsert", error: error.message });
      upsertFailed = true;
    } else {
      totalUpserted = count ?? deduped.length;
    }
  }

  // 5) 새로 upsert 된(+ 아직 요약 없는 과거) 기사에 한국어 AI 요약을 채운다.
  //    메인 upsert 와 분리된 별도 UPDATE 라 재수집해도 기존 요약을 덮어쓰지 않음. budget 으로 cron 60s 한도 보호.
  let summarized = 0;
  try {
    summarized = await enrichSummaries(supabase, 30);
  } catch (err) {
    results.push({ source: "ai-summary", error: (err as Error).message });
  }

  // 진단용 본문은 그대로 두되, upsert 가 실패했으면 status 500 으로 내려 워크플로의
  // `test "${code}" = "200"` 검증이 실패하도록 한다. ok 도 false 로 맞춘다.
  return Response.json(
    {
      ok: !upsertFailed,
      ran_at: new Date().toISOString(),
      feeds: FEEDS.length,
      candidates: candidates.length,
      deduped: deduped.length,
      removed_dupes: candidates.length - deduped.length,
      total_upserted: totalUpserted,
      summarized,
      results,
    },
    { status: upsertFailed ? 500 : 200 },
  );
}
