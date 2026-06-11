"use client";

import { useMemo, useState } from "react";

import type { RepoRank } from "@/lib/github";

type Tab = "stars" | "weekly";

const RANK_BADGE: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

export function RankingClient({ tools }: { tools: RepoRank[] }) {
  const [tab, setTab] = useState<Tab>("stars");
  const weeklyAvailable = useMemo(() => tools.some((t) => t.weeklyStars !== null), [tools]);

  const ranked = useMemo(() => {
    const list = [...tools];
    if (tab === "weekly") {
      // 주간 증가 내림차순(미집계 null 은 맨 뒤), 동률은 누적 star 로.
      list.sort((a, b) => (b.weeklyStars ?? -1) - (a.weeklyStars ?? -1) || b.stars - a.stars);
    } else {
      list.sort((a, b) => b.stars - a.stars);
    }
    return list;
  }, [tools, tab]);

  if (tools.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
        랭킹 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요. (GitHub API 한도일 수 있어요)
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 inline-flex gap-1 rounded-full bg-zinc-900/[0.04] p-1 dark:bg-white/[0.06]">
        {([["stars", "누적 ⭐"], ["weekly", "주간 ⭐ 증가"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={
              "rounded-full px-4 py-1.5 text-sm font-bold transition-colors " +
              (tab === key
                ? "bg-violet-600 text-white shadow-[0_4px_12px_-4px_rgba(124,58,237,0.5)]"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "weekly" && !weeklyAvailable && (
        <p className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          주간 ⭐ 증가는 <code className="font-mono">GITHUB_TOKEN</code> 환경변수가 설정돼 있을 때 표시됩니다.
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {ranked.map((t, i) => {
          const isWeekly = tab === "weekly";
          return (
            <li key={t.repo}>
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-2xl border-2 border-zinc-900/10 bg-white px-4 py-3 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-[0_14px_30px_-14px_rgba(124,58,237,0.4)] dark:border-white/10 dark:bg-zinc-900/70 dark:hover:border-violet-400/60"
              >
                <span
                  className={
                    "w-8 shrink-0 text-center text-lg font-black tabular-nums " +
                    (i < 3 ? "" : "text-zinc-300 dark:text-zinc-600")
                  }
                >
                  {RANK_BADGE[i] ?? i + 1}
                </span>

                <div className="min-w-0 grow">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-zinc-900 group-hover:text-violet-600 dark:text-zinc-100 dark:group-hover:text-violet-400">
                      {t.label}
                    </span>
                    {t.language && (
                      <span className="shrink-0 rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                        {t.language}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {t.blurb} · {t.repo}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end">
                  {isWeekly && t.weeklyStars !== null ? (
                    <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      ▲ {t.weeklyStars.toLocaleString()}
                      {t.weeklyCapped ? "+" : ""}
                      <span className="text-[11px] font-medium text-zinc-400"> /주</span>
                    </span>
                  ) : (
                    <span className="font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                      ⭐ {t.stars.toLocaleString()}
                    </span>
                  )}
                  <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                    {isWeekly ? `⭐ ${t.stars.toLocaleString()}` : `🍴 ${t.forks.toLocaleString()}`}
                  </span>
                </div>
              </a>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 text-center text-xs text-zinc-400 dark:text-zinc-500">
        GitHub 공개 지표 기준 · 1시간마다 갱신
      </p>
    </>
  );
}
