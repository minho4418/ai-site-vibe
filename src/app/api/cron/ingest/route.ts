import Parser from "rss-parser";

import { enrichSummaries } from "@/lib/ai-summary";
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
  upserted?: number;
  error?: string;
  // 임시 진단용 — RSS 첫 항목의 시간 후보를 그대로 보여줌
  debug_first_item?: Record<string, string | undefined>;
};

// rss-parser 가 RSS 2.0 의 pubDate 는 자동으로 isoDate 로 만들어주지만,
// Atom 의 <published>/<updated>, Dublin Core 의 <dc:date> 는 customFields 로 명시해야 가져온다.
const DATE_FIELDS = ["isoDate", "pubDate", "published", "updated", "dc:date", "date"] as const;
type RawItem = Partial<Record<(typeof DATE_FIELDS)[number], string>>;

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
    },
  });

  const results: FeedResult[] = [];
  let totalUpserted = 0;
  // 같은 ingest 안에서 시간 정보가 빠진 글들도 RSS 순서를 보존하도록 fallback 의 기준점.
  const ingestStart = Date.now();
  // RSS 에 이미지가 없는 직링크 기사에 og:image 를 채우는 전체 예산(cron 60s 한도 보호). 신규 직링크는 보통 이보다 적다.
  let ogBudget = 40;

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const limit = feed.limit ?? 15;
      const rows = parsed.items
        .filter((item) => item.link && item.title)
        .map((item) => ({
          item,
          title: item.title!.trim(),
          summary: extractSummary(item.contentSnippet ?? item.content ?? ""),
        }))
        // 종합 피드(aiOnly)는 AI 관련 글만 남긴다. slice 보다 먼저 걸러야 limit 개를 채운다.
        .filter(({ title, summary }) => !feed.aiOnly || isAiRelated(`${title} ${summary}`))
        .slice(0, limit)
        .map(({ item, title, summary }, index) => ({
          url: normalizeUrl(item.link!),
          title,
          source: feed.source,
          // 키워드로 카테고리를 재분류, 실패 시 피드 기본값 사용.
          category: classifyCategory(`${title} ${summary}`) ?? feed.category,
          summary,
          thumbnail_url: extractThumbnail(item),
          // RSS 가 시간을 안 주면(예: 일부 Google News, 한국 RSS) 같은 시각 fallback 으로 동률이 생긴다.
          // → ingest 시작 시점에서 index*1초 만큼 과거로 분산시켜 RSS 항목 순서(최신 → 오래된)를 그대로 보존.
          published_at: pickPublishedAt(item, ingestStart, index),
        }));

      if (rows.length === 0) {
        results.push({ source: feed.source, fetched: 0, upserted: 0 });
        continue;
      }

      // RSS 에 이미지가 없는 직링크 기사들에 한해 og:image 보강(Google News 는 자동 제외).
      ogBudget = await enrichThumbnails(rows, ogBudget);

      // ignoreDuplicates=false → 같은 URL 의 row 는 새 RSS 데이터로 갱신.
      // articles.likes_count 는 rows 에 포함하지 않으므로 기존 값이 유지됨.
      const { error, count } = await supabase
        .from("articles")
        .upsert(rows, { onConflict: "url", count: "exact" });

      // 임시 진단: 첫 RSS item 이 어떤 시간 필드를 가지고 있는지 응답으로 노출 (확인 후 제거 예정).
      const firstItem = (parsed.items[0] ?? {}) as unknown as Record<string, unknown>;
      const debug_first_item: Record<string, string | undefined> = {};
      for (const key of DATE_FIELDS) {
        const v = firstItem[key];
        if (typeof v === "string") debug_first_item[key] = v;
      }

      if (error) {
        results.push({ source: feed.source, fetched: rows.length, error: error.message, debug_first_item });
      } else {
        const upserted = count ?? rows.length;
        totalUpserted += upserted;
        results.push({ source: feed.source, fetched: rows.length, upserted, debug_first_item });
      }
    } catch (err) {
      results.push({ source: feed.source, error: (err as Error).message });
    }
  }

  // 새로 upsert 된(+ 아직 요약 없는 과거) 기사에 한국어 AI 요약을 채운다.
  // 메인 upsert 와 분리된 별도 UPDATE 라 재수집해도 기존 요약을 덮어쓰지 않음. budget 으로 cron 60s 한도 보호.
  let summarized = 0;
  try {
    summarized = await enrichSummaries(supabase, 30);
  } catch (err) {
    results.push({ source: "ai-summary", error: (err as Error).message });
  }

  return Response.json({
    ok: true,
    ran_at: new Date().toISOString(),
    feeds: FEEDS.length,
    total_upserted: totalUpserted,
    summarized,
    results,
  });
}
