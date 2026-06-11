"use client";

import { useMemo } from "react";

import { topKeywords, type KeywordStat } from "@/lib/keywords";
import type { Article } from "@/lib/types";

type Props = {
  articles: Article[];
  /** 현재 활성화된 키워드 라벨(있으면 칩 강조) */
  activeLabel?: string | null;
  /** 칩 클릭 → 해당 키워드로 필터(같은 걸 다시 누르면 해제) */
  onPick: (keyword: KeywordStat) => void;
};

export function KeywordRail({ articles, activeLabel, onPick }: Props) {
  // 가져온 카드 전체(최신 ~80개) 제목에서 자주 등장하는 키워드 상위 5개.
  const keywords = useMemo(() => topKeywords(articles, { limit: 5 }), [articles]);

  if (keywords.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-zinc-800 dark:text-zinc-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-violet-500 dark:text-violet-400">
            <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 7v5l3 2" />
          </svg>
          오늘의 키워드
        </span>
        {keywords.map((k) => {
          const active = k.label === activeLabel;
          return (
            <button
              key={k.label}
              type="button"
              onClick={() => onPick(k)}
              aria-pressed={active}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] " +
                (active
                  ? "border-transparent bg-violet-600 text-white shadow-[0_4px_12px_-4px_rgba(124,58,237,0.5)]"
                  : "border-zinc-900/10 bg-white/70 text-zinc-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-violet-400/60 dark:hover:bg-violet-500/10 dark:hover:text-violet-300")
              }
            >
              <span className={active ? "text-white/70" : "text-violet-500 dark:text-violet-400"}>#</span>
              {k.label}
              <span className={"text-xs font-bold " + (active ? "text-white/70" : "text-zinc-400 dark:text-zinc-500")}>
                {k.count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
