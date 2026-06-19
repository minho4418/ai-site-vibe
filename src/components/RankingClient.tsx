"use client";

import { useMemo, useState } from "react";

import { BackToNewsLink } from "@/components/BackToNewsLink";
import { BrandLogo } from "@/components/BrandLogo";
import type { CategoryKey } from "@/lib/ai-tools";
import type { Ranking, RankedRepo } from "@/lib/github";

type TabKey = CategoryKey | "weekly";

const TABS: { key: TabKey; label: string }[] = [
  { key: "agents", label: "코딩·에이전트" },
  { key: "skills", label: "스킬·프레임워크" },
  { key: "mcp", label: "MCP 서버" },
  { key: "weekly", label: "🔥 주간 상승" },
];

// 로고 클릭 시 되돌릴 기본 탭. (TABS 의 첫 항목과 동일하게 유지)
const INITIAL_TAB: TabKey = "agents";

const CAT_LABEL: Record<CategoryKey, string> = {
  skills: "스킬",
  agents: "코딩·에이전트",
  mcp: "MCP",
};

const RANK_BADGE: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

export function RankingClient({ ranking }: { ranking: Ranking }) {
  const [tab, setTab] = useState<TabKey>(INITIAL_TAB);

  const rows = useMemo<RankedRepo[]>(
    () => (tab === "weekly" ? ranking.weeklyTop : ranking.byCategory[tab]),
    [tab, ranking],
  );

  // 로고 클릭 → 처음 들어온 상태로 리셋(기본 탭으로 + 맨 위로). 홈 화면 로고와 동일한 동작.
  const resetToInitial = () => {
    setTab(INITIAL_TAB);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-dvh text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-900/10 bg-[#FBF6EC]/80 backdrop-blur-md dark:border-white/10 dark:bg-[#0d0b14]/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <BrandLogo onClick={resetToInitial} ariaLabel="랭킹 처음 화면으로 (탭 초기화 · 맨 위로)" />
          <BackToNewsLink />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-5 font-display text-3xl tracking-tight">AI 랭킹</h1>

        <div className="mb-4 flex flex-wrap gap-1 rounded-2xl bg-zinc-900/[0.04] p-1 dark:bg-white/[0.06]">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={
                "rounded-xl px-3.5 py-1.5 text-sm font-bold transition-colors " +
                (tab === t.key
                  ? "bg-violet-600 text-white shadow-[0_4px_12px_-4px_rgba(124,58,237,0.5)]"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "weekly" && !ranking.weeklyAvailable ? (
          <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            🔥 주간 상승은 <code className="font-mono text-xs">GITHUB_TOKEN</code> 환경변수가 설정돼 있을 때
            표시됩니다. (stargazers 집계에 인증이 필요)
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
            데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요. (GitHub API 한도일 수 있어요)
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((t, i) => {
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
                        {isWeekly && (
                          <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                            {CAT_LABEL[t.category]}
                          </span>
                        )}
                        {t.language && (
                          <span className="hidden shrink-0 rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400 sm:inline">
                            {t.language}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {t.description || t.repo}
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
        )}

        <p className="mt-5 text-center text-xs text-zinc-400 dark:text-zinc-500">
          큐레이션 목록 · GitHub 공개 지표 · 1시간마다 갱신
        </p>
      </main>
    </div>
  );
}
