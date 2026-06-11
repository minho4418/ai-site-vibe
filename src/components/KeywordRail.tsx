"use client";

import { useMemo } from "react";

import { topKeywords } from "@/lib/keywords";
import type { Article } from "@/lib/types";

type Props = {
  articles: Article[];
  /** 칩 클릭 → 해당 키워드로 검색 */
  onPick: (query: string) => void;
};

export function KeywordRail({ articles, onPick }: Props) {
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
        {keywords.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => onPick(k.q)}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-900/10 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-700 transition-colors hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-violet-400/60 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
          >
            <span className="text-violet-500 dark:text-violet-400">#</span>
            {k.label}
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">{k.count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
