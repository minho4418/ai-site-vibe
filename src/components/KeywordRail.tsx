"use client";

import { useMemo, useState } from "react";

import { topKeywords, withinMs } from "@/lib/keywords";
import type { Article } from "@/lib/types";

const DAY_MS = 86_400_000;

type Tab = "today" | "week" | "hot";
const TABS: { key: Tab; label: string }[] = [
  { key: "today", label: "오늘의 키워드" },
  { key: "week", label: "금주 키워드" },
  { key: "hot", label: "화제의 키워드" },
];

type Props = {
  articles: Article[];
  /** Date.now() (마운트 후 주입). 0 이면 시간대(오늘/금주) 집계는 비고, 화제는 정상 동작. */
  now: number;
  /** 칩 클릭 → 해당 키워드로 검색 */
  onPick: (query: string) => void;
};

export function KeywordRail({ articles, now, onPick }: Props) {
  // 기본 탭은 '화제'(시간 비의존) — SSR/하이드레이션 시 now 없이도 동일하게 채워져 깜빡임이 없다.
  const [tab, setTab] = useState<Tab>("hot");

  const keywords = useMemo(() => {
    if (tab === "hot") {
      // 화제도 = 등장 빈도에 조회·좋아요를 가중(좋아요는 2배). 관심 0 인 글도 빈도로는 기여.
      return topKeywords(articles, {
        limit: 12,
        weight: (a) => 1 + (a.views_count ?? 0) + (a.likes_count ?? 0) * 2,
      });
    }
    const win = tab === "today" ? DAY_MS : 7 * DAY_MS;
    return topKeywords(withinMs(articles, win, now), { limit: 12 });
  }, [articles, tab, now]);

  return (
    <section className="mb-6 rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={
              "shrink-0 rounded-full px-3 py-1 text-sm font-bold transition-colors " +
              (tab === t.key
                ? "bg-violet-600 text-white shadow-[0_4px_12px_-4px_rgba(124,58,237,0.5)]"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {keywords.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
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
      ) : (
        <p className="mt-2.5 text-sm text-zinc-400 dark:text-zinc-500">
          {tab === "today" ? "아직 오늘 집계된 키워드가 없어요." : "집계된 키워드가 없어요."}
        </p>
      )}
    </section>
  );
}
