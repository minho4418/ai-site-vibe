import type { Metadata } from "next";
import Link from "next/link";

import { RankingClient } from "@/components/RankingClient";
import { getRanking } from "@/lib/github";

// GitHub 지표는 1시간마다 갱신(ISR).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "AI 랭킹 — Knewit",
  description: "Cline·Cursor·Aider·OpenHands 등 AI 코딩·에이전트 도구를 GitHub ⭐ 기준으로 랭킹.",
};

export default async function RankingPage() {
  const ranking = await getRanking();

  return (
    <div className="min-h-dvh text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-900/10 bg-[#FBF6EC]/80 backdrop-blur-md dark:border-white/10 dark:bg-[#0d0b14]/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex w-fit items-center gap-2.5 rounded-xl transition-opacity hover:opacity-80 active:scale-[0.98]"
          >
            <div className="grain relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-orange-400 text-white shadow-[0_4px_14px_-4px_rgba(168,85,247,0.6)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="relative h-4 w-4">
                <path d="M8 5v14M8 12l8-7M8 12l8 7" />
              </svg>
            </div>
            <span className="font-display text-xl tracking-tight">Knewit</span>
          </Link>
          <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">🏆 AI 랭킹</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-1 font-display text-3xl tracking-tight">AI 랭킹</h1>
        <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
          코딩·에이전트, 스킬·프레임워크, MCP 서버를 GitHub ⭐ 기준으로 줄세웠어요. 🔥 주간 상승 탭은 전체에서 최근 7일 ⭐ 증가순.
        </p>
        <RankingClient ranking={ranking} />
      </main>
    </div>
  );
}
