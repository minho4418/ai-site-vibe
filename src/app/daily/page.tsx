import type { Metadata } from "next";
import Link from "next/link";

import { DailyHeader } from "@/components/DailyHeader";
import { listBriefings } from "@/lib/briefings";
import { formatBriefingDate } from "@/lib/format-briefing-date";

export const metadata: Metadata = {
  title: "오늘의 브리핑",
  description: "매일 오전 8시, 그날의 AI·개발 소식을 한눈에 읽도록 자동 큐레이션한 데일리 브리핑 모음.",
  alternates: { canonical: "/daily" },
  openGraph: {
    title: "오늘의 브리핑 - Knewit",
    description: "그날의 AI·개발 소식을 한눈에. 매일 오전 8시 업데이트.",
    url: "/daily",
    type: "website",
  },
};

// 브리핑은 DB 에서 오고 배포 없이 갱신되므로 ISR(5분)로 받는다.
export const revalidate = 300;

export default async function DailyIndexPage() {
  const briefings = await listBriefings();

  return (
    <div className="min-h-dvh text-zinc-900 dark:text-zinc-100">
      <DailyHeader />

      <main className="mx-auto max-w-3xl px-4 py-7">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">오늘의 브리핑</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          그날의 AI·개발 소식을 한눈에. 매일 오전 8시 자동 업데이트.
        </p>

        {briefings.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-zinc-900/15 bg-white/50 py-16 text-center dark:border-white/15 dark:bg-white/5">
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">아직 브리핑이 없어요</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">곧 첫 브리핑이 올라옵니다.</p>
          </div>
        ) : (
          <ul className="mt-7 flex flex-col gap-3">
            {briefings.map((b) => (
              <li key={b.date}>
                <Link
                  href={`/daily/${b.date}`}
                  className="group flex flex-col gap-1.5 rounded-2xl border-2 border-zinc-900/10 bg-white px-5 py-4 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-[0_14px_30px_-14px_rgba(124,58,237,0.4)] dark:border-white/10 dark:bg-zinc-900/70 dark:hover:border-violet-400/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                      {formatBriefingDate(b.date, true)}
                    </span>
                    {b.sample && (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        예시
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-zinc-900 group-hover:text-violet-600 dark:text-zinc-100 dark:group-hover:text-violet-400">
                    {b.title ?? "오늘의 AI·개발 브리핑"}
                  </span>
                  {b.summary && (
                    <span className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {b.summary}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-10 pt-6 text-center text-xs font-medium text-zinc-500 dark:text-zinc-500">
        오늘의 AI 뉴스 · 매일 오전 8시 업데이트
      </footer>
    </div>
  );
}
