import Parser from "rss-parser";

import { classifyCategory, isAiRelated } from "@/lib/categorize";
import { FEEDS } from "@/lib/feeds";
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
};

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
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ai-news-bot/1.0; +https://github.com/your-handle/ai-news)",
    },
  });

  const results: FeedResult[] = [];
  let totalUpserted = 0;

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
        .map(({ item, title, summary }) => ({
          url: normalizeUrl(item.link!),
          title,
          source: feed.source,
          // 키워드로 카테고리를 재분류, 실패 시 피드 기본값 사용.
          category: classifyCategory(`${title} ${summary}`) ?? feed.category,
          summary,
          thumbnail_url: extractThumbnail(item),
          published_at:
            item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()),
        }));

      if (rows.length === 0) {
        results.push({ source: feed.source, fetched: 0, upserted: 0 });
        continue;
      }

      const { error, count } = await supabase
        .from("articles")
        .upsert(rows, { onConflict: "url", ignoreDuplicates: true, count: "exact" });

      if (error) {
        results.push({ source: feed.source, fetched: rows.length, error: error.message });
      } else {
        const upserted = count ?? rows.length;
        totalUpserted += upserted;
        results.push({ source: feed.source, fetched: rows.length, upserted });
      }
    } catch (err) {
      results.push({ source: feed.source, error: (err as Error).message });
    }
  }

  return Response.json({
    ok: true,
    ran_at: new Date().toISOString(),
    feeds: FEEDS.length,
    total_upserted: totalUpserted,
    results,
  });
}
