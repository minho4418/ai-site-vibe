import Link from "next/link";

import { formatBriefingDate } from "@/lib/format-briefing-date";
import type { Briefing } from "@/lib/briefings";

// 홈 최상단 히어로: 최신 오늘의 브리핑을 요약 미리보기로 보여주고 전체 페이지로 유도한다.
// 프레젠테이션 전용(훅 없음) — 클라이언트(HomeClient)·서버 어디서 import 해도 안전.
export function DailyHero({ briefing }: { briefing: Briefing }) {
  // 앞쪽 섹션에서 최대 3개 항목 제목만 뽑아 맛보기로 노출.
  const teasers = briefing.sections.flatMap((s) => s.items).slice(0, 3);

  return (
    <section className="mb-7 overflow-hidden rounded-3xl border-2 border-violet-500/20 bg-gradient-to-br from-white via-white to-violet-50/60 shadow-[0_18px_40px_-24px_rgba(124,58,237,0.45)] dark:border-violet-400/20 dark:from-zinc-900/80 dark:via-zinc-900/80 dark:to-violet-950/30">
      <div className="flex flex-col gap-4 p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 py-1 text-xs font-bold text-white shadow-[0_4px_12px_-4px_rgba(168,85,247,0.6)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            오늘의 브리핑
          </span>
          <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
            {formatBriefingDate(briefing.date, true)}
          </span>
          {briefing.sample && (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              예시
            </span>
          )}
        </div>

        <h2 className="font-display text-2xl leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          {briefing.title ?? "오늘의 AI·개발 브리핑"}
        </h2>

        {briefing.summary && (
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-base">
            {briefing.summary}
          </p>
        )}

        {teasers.length > 0 && (
          <ul className="flex flex-col gap-2">
            {teasers.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[11px] font-black text-violet-600 dark:bg-violet-400/15 dark:text-violet-300">
                  {i + 1}
                </span>
                <span className="line-clamp-2">{item.text}</span>
              </li>
            ))}
          </ul>
        )}

        <div>
          <Link
            href={`/daily/${briefing.date}`}
            className="inline-flex h-10 select-none items-center gap-1.5 rounded-full bg-violet-600 px-5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.7)] transition-[transform,background-color] hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97]"
          >
            전체 브리핑 읽기
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
