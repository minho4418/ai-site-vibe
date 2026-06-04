"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { ArticleCard } from "@/components/ArticleCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SearchInput } from "@/components/SearchInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { CategoryId } from "@/lib/categories";
import type { Article } from "@/lib/types";
import { useBookmarks } from "@/lib/use-bookmarks";
import { useDeviceId } from "@/lib/use-device-id";
import { useLikes } from "@/lib/use-likes";

type Props = {
  articles: Article[];
  usingMock: boolean;
};

export function HomeClient({ articles, usingMock }: Props) {
  const [category, setCategory] = useState<CategoryId>("all");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const deviceId = useDeviceId();
  const { set: likedSet, overrides: likesOverrides, toggle: toggleLike, hydrated: likedHydrated } = useLikes(deviceId);
  const { set: bookmarkedSet, toggle: toggleBookmark, hydrated: bookmarksHydrated } = useBookmarks(deviceId);
  const hydrated = likedHydrated && bookmarksHydrated;

  const counts = useMemo(() => {
    const c: Partial<Record<CategoryId, number>> = { all: articles.length };
    for (const a of articles) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [articles]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return articles.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (showBookmarksOnly && !bookmarkedSet.has(a.id)) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
      );
    });
  }, [articles, category, deferredQuery, showBookmarksOnly, bookmarkedSet]);

  return (
    <div className="min-h-dvh text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-900/10 bg-[#FBF6EC]/80 backdrop-blur-md dark:border-white/10 dark:bg-[#0d0b14]/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grain relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-orange-400 text-white shadow-[0_4px_14px_-4px_rgba(168,85,247,0.6)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative h-4 w-4">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <span className="font-display text-xl tracking-tight">AI 뉴스</span>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput value={query} onChange={setQuery} />
            <button
              type="button"
              onClick={() => setShowBookmarksOnly((v) => !v)}
              aria-pressed={showBookmarksOnly}
              className={
                "inline-flex h-9 select-none items-center gap-1.5 rounded-full border-2 px-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] " +
                (showBookmarksOnly
                  ? "border-transparent bg-rose-600 text-white shadow-[0_4px_14px_-4px_rgba(225,29,72,0.5)]"
                  : "border-zinc-900/10 bg-white/70 text-zinc-700 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10")
              }
            >
              <svg viewBox="0 0 24 24" fill={showBookmarksOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span className="hidden sm:inline">북마크</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3">
          <CategoryFilter active={category} onChange={setCategory} counts={counts} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* ── Config 무드 히어로 ───────────────────────────────── */}
        <section className="grain relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 px-6 py-12 shadow-[0_24px_60px_-24px_rgba(124,58,237,0.6)] sm:px-10 sm:py-16">
          <span aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-orange-400/60 blur-3xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -right-12 bottom-[-3rem] h-72 w-72 rounded-full bg-pink-400/50 blur-3xl" />
          <span aria-hidden="true" className="pointer-events-none absolute right-1/3 top-0 h-44 w-44 rounded-full bg-cyan-300/40 blur-3xl" />
          <div className="relative">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-inset ring-white/25 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              매시간 자동 업데이트
            </span>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white sm:text-7xl">
              AI 뉴스
            </h1>
            <p className="mt-4 max-w-xl text-base font-medium text-white/85 sm:text-lg">
              한국 개발자를 위한 AI·개발툴·실무·창업·공모전 소식을 한 곳에서.
            </p>
            <p className="mt-3 text-sm font-bold uppercase tracking-wider text-white/70">
              {articles.length}개 큐레이션 · RSS 기반
            </p>
          </div>
        </section>

        {usingMock && (
          <div className="mb-6 flex flex-col gap-1 rounded-2xl border-2 border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <span className="font-bold">샘플 데이터를 표시 중입니다.</span>
            <span className="text-xs text-amber-800/80 dark:text-amber-200/80">
              <code className="rounded bg-amber-900/10 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-100/10">.env.local</code> 설정 후 RSS cron 을 돌리면 실제 기사가 로드됩니다.
            </span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-zinc-900/15 bg-white/50 py-16 text-center dark:border-white/15 dark:bg-white/5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-zinc-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-3.5-3.5" />
            </svg>
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">조건에 맞는 기사가 없어요</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">검색어를 지우거나 카테고리를 바꿔보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                liked={likedSet.has(article.id)}
                bookmarked={bookmarkedSet.has(article.id)}
                hydrated={hydrated}
                likesOverride={likesOverrides.get(article.id)}
                onToggleLike={toggleLike}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-center text-xs font-medium text-zinc-500 dark:text-zinc-500">
        한국 개발자를 위한 AI 큐레이션 · RSS 기반 · 매시간 업데이트
      </footer>
    </div>
  );
}
