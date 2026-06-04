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
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">AI News</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Curated for engineers · {articles.length} articles</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput value={query} onChange={setQuery} />
            <button
              type="button"
              onClick={() => setShowBookmarksOnly((v) => !v)}
              aria-pressed={showBookmarksOnly}
              className={
                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] " +
                (showBookmarksOnly
                  ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800")
              }
            >
              <svg viewBox="0 0 24 24" fill={showBookmarksOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span className="hidden sm:inline">Bookmarks</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3">
          <CategoryFilter active={category} onChange={setCategory} counts={counts} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {usingMock && (
          <div className="mb-5 flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <span className="font-medium">Showing sample data.</span>
            <span className="text-xs text-amber-800/80 dark:text-amber-200/80">
              Configure <code className="rounded bg-amber-900/10 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-100/10">.env.local</code> and run the RSS cron to load real articles.
            </span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-zinc-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-3.5-3.5" />
            </svg>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No articles match your filters</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Try clearing the search or switching categories.</p>
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

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
        Built for engineers · RSS-powered · Updates hourly
      </footer>
    </div>
  );
}
