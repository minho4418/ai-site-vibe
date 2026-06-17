import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BriefingView } from "@/components/BriefingView";
import { DailyHeader } from "@/components/DailyHeader";
import { getBriefing } from "@/lib/briefings";
import { briefingJsonLd } from "@/lib/briefing-jsonld";
import { formatBriefingDate } from "@/lib/format-briefing-date";

type Params = { params: Promise<{ date: string }> };

// 브리핑은 DB 에서 오고 배포 없이 갱신되므로 ISR(5분). 처음 요청 시 생성 후 캐시.
export const revalidate = 300;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { date } = await params;
  const briefing = await getBriefing(date);
  if (!briefing) return { title: "오늘의 브리핑" };

  const label = formatBriefingDate(date);
  const title = briefing.title ? `${briefing.title} (${label})` : `${label} 브리핑`;
  const description =
    briefing.summary ?? `${label}의 AI·개발 소식을 한눈에 정리한 오늘의 브리핑.`;

  return {
    title,
    description,
    alternates: { canonical: `/daily/${date}` },
    openGraph: {
      title: `${title} - Knewit`,
      description,
      url: `/daily/${date}`,
      type: "article",
    },
  };
}

export default async function DailyDatePage({ params }: Params) {
  const { date } = await params;
  const briefing = await getBriefing(date);
  if (!briefing) notFound();

  return (
    <div className="min-h-dvh text-zinc-900 dark:text-zinc-100">
      {/* GEO/구조화 데이터: 이 브리핑을 NewsArticle 로 기계가 읽게 한다(출처 citation 포함). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(briefingJsonLd(briefing)) }}
      />
      <DailyHeader />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <BriefingView briefing={briefing} />

        <div className="mt-10 border-t border-zinc-900/10 pt-6 dark:border-white/10">
          <Link
            href="/daily"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="m15 18-6-6 6-6" />
            </svg>
            지난 브리핑 모두 보기
          </Link>
        </div>
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-10 pt-6 text-center text-xs font-medium text-zinc-500 dark:text-zinc-500">
        오늘의 AI 뉴스 · 매일 오전 8시 업데이트
      </footer>
    </div>
  );
}
