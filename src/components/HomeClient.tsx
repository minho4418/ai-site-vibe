"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { ArticleCard } from "@/components/ArticleCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { KeywordRail } from "@/components/KeywordRail";
import { SearchInput } from "@/components/SearchInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fetchArticlesByIds } from "@/lib/articles-client";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import type { Article } from "@/lib/types";
import { useBookmarks } from "@/lib/use-bookmarks";
import { useDeviceId } from "@/lib/use-device-id";
import { useLikes } from "@/lib/use-likes";

type Props = {
  articles: Article[];
  usingMock: boolean;
};

// 🔥인기 배지 기준 (design-system.md §4): 갯수 임계값 없이, 조회수 '높은순 상위 20%'.
// 단 조회 0 인 글(아무도 안 누른 글)은 후보에서 제외해 모든 카드가 인기가 되는 걸 막는다.
const HOT_TOP_FRACTION = 0.2;

// 피드 정렬 기준. latest = 서버 순서(최신 + 소스당 상한 분산) 그대로,
// popular = 조회수순, likes = 좋아요순. popular/likes 는 동점이면 stable sort 로 latest(분산) 순서를 보존.
type SortKey = "latest" | "popular" | "likes";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "popular", label: "인기순" },
  { key: "likes", label: "좋아요순" },
];

export function HomeClient({ articles, usingMock }: Props) {
  const [category, setCategory] = useState<CategoryId>("all");
  // 모바일에서 카테고리 탭(9개)이 3~4줄로 펼쳐져 sticky 헤더가 화면을 덮는 걸 막기 위한 접기/펼치기.
  // 데스크탑(sm+)은 항상 펼쳐 두므로 이 상태는 모바일에만 영향.
  const [catOpen, setCatOpen] = useState(false);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("latest");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  // 오늘의 키워드 칩으로 거는 전용 필터. count 와 동일하게 '제목 정규식'으로만 걸러
  // 칩에 보이는 숫자 = 실제 노출 카드 수가 일치하게 한다. (검색창 query 와는 별개)
  const [keyword, setKeyword] = useState<{ label: string; re: RegExp } | null>(null);

  const activeCategoryLabel = CATEGORIES.find((c) => c.id === category)?.label ?? "전체";

  const deviceId = useDeviceId();
  const { set: likedSet, overrides: likesOverrides, toggle: toggleLike, hydrated: likedHydrated } = useLikes(deviceId);
  const { set: bookmarkedSet, toggle: toggleBookmark, hydrated: bookmarksHydrated } = useBookmarks(deviceId);
  const hydrated = likedHydrated && bookmarksHydrated;

  const counts = useMemo(() => {
    const c: Partial<Record<CategoryId, number>> = { all: articles.length };
    for (const a of articles) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [articles]);

  // 최신 60개에 들어있는 기사 id 집합.
  const articleIds = useMemo(() => new Set(articles.map((a) => a.id)), [articles]);

  // 🔥인기로 표시할 기사 id: 표출된 피드(최신 N개)의 상위 20% 자리를 조회수 높은 순으로 채운다.
  // 단 조회 0 인 글은 후보에서 제외(아무도 안 누른 글이 인기로 채워지지 않게) → 실제 HOT 수 = min(피드의 20%, 조회된 글 수).
  const hotIds = useMemo(() => {
    const ranked = articles
      .filter((a) => (a.views_count ?? 0) > 0)
      .sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0));
    const topN = Math.ceil(articles.length * HOT_TOP_FRACTION);
    return new Set(ranked.slice(0, topN).map((a) => a.id));
  }, [articles]);

  // 북마크했지만 최신 60개 밖으로 밀려난 기사들 — 북마크 보기를 켤 때만 id 로 추가 조회.
  const [bookmarkedExtras, setBookmarkedExtras] = useState<Article[]>([]);

  useEffect(() => {
    if (!showBookmarksOnly || !bookmarksHydrated) return;
    const have = new Set([...articleIds, ...bookmarkedExtras.map((a) => a.id)]);
    const missing = [...bookmarkedSet].filter((id) => !have.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    fetchArticlesByIds(missing).then((rows) => {
      if (cancelled || rows.length === 0) return;
      setBookmarkedExtras((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
    });
    return () => {
      cancelled = true;
    };
  }, [showBookmarksOnly, bookmarksHydrated, bookmarkedSet, articleIds, bookmarkedExtras]);

  // 북마크 보기에서는 (최신 60개 + 추가로 가져온 북마크 기사)를, 그 외엔 최신 60개만 사용.
  const source = useMemo(() => {
    if (!showBookmarksOnly || bookmarkedExtras.length === 0) return articles;
    const extra = bookmarkedExtras.filter((a) => !articleIds.has(a.id));
    return [...articles, ...extra];
  }, [showBookmarksOnly, articles, bookmarkedExtras, articleIds]);

  // 로고 클릭 → 처음 접속 상태로 리셋(전체 카테고리·검색어 비움·북마크 보기 해제·맨 위로).
  const resetToInitial = () => {
    setCategory("all");
    setQuery("");
    setKeyword(null);
    setShowBookmarksOnly(false);
    setSortBy("latest");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return source.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (showBookmarksOnly && !bookmarkedSet.has(a.id)) return false;
      // 키워드 필터: count 와 동일한 제목 정규식. (칩 숫자 = 노출 카드 수 보장)
      if (keyword && !keyword.re.test(a.title)) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
      );
    });
  }, [source, category, deferredQuery, showBookmarksOnly, bookmarkedSet, keyword]);

  // 정렬: latest 는 서버 순서 유지(재정렬하면 cap 으로 분산시킨 게 가짜시간으로 다시 쏠림).
  // popular/likes 만 재정렬하며, 동점(대부분 0)은 Array.sort 안정성으로 latest(분산) 순서를 보존한다.
  // 좋아요는 표시값과 동일하게 override(낙관적/동기화된 정확한 카운트) 우선, 없으면 likes_count.
  const sorted = useMemo(() => {
    if (sortBy === "latest") return filtered;
    if (sortBy === "popular") {
      return [...filtered].sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0));
    }
    const likeCount = (a: Article) => likesOverrides.get(a.id) ?? a.likes_count ?? 0;
    return [...filtered].sort((a, b) => likeCount(b) - likeCount(a));
  }, [filtered, sortBy, likesOverrides]);

  return (
    <div className="min-h-dvh text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-900/10 bg-[#FBF6EC]/80 backdrop-blur-md dark:border-white/10 dark:bg-[#0d0b14]/80">
        <div className="mx-auto flex max-w-6xl select-none flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={resetToInitial}
            aria-label="처음 화면으로 (필터·검색 초기화)"
            className="flex w-fit cursor-pointer items-center gap-2.5 rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.98]"
          >
            <div className="grain relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-orange-400 text-white shadow-[0_4px_14px_-4px_rgba(168,85,247,0.6)]">
              {/* Knewit 'K' 모노그램 (파비콘 src/app/icon.svg 와 동일 형태) */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="relative h-4 w-4">
                <path d="M8 5v14M8 12l8-7M8 12l8 7" />
              </svg>
            </div>
            <span className="font-display text-xl tracking-tight">Knewit</span>
          </button>
          <div className="flex items-center gap-2">
            <SearchInput value={query} onChange={setQuery} />
            <Link
              href="/ranking"
              aria-label="AI 랭킹"
              className="inline-flex h-9 shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-zinc-900/10 bg-white/70 px-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM5 7H3a2 2 0 0 0 0 4h2M19 7h2a2 2 0 0 1 0 4h-2" />
              </svg>
              <span className="hidden sm:inline">AI 랭킹</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowBookmarksOnly((v) => !v)}
              aria-pressed={showBookmarksOnly}
              className={
                "inline-flex h-9 shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] " +
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
        <div className="mx-auto max-w-6xl px-4 pb-3">
          {/* 모바일 전용 토글: 접힌 상태에선 현재 카테고리 + 펼치기 버튼만 노출 → 헤더 높이 절약 */}
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            aria-expanded={catOpen}
            aria-controls="category-filter"
            className="flex w-full items-center justify-between gap-2 rounded-full border-2 border-zinc-900/10 bg-white/70 px-4 py-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.99] dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 sm:hidden"
          >
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-zinc-500 dark:text-zinc-400">
                <path d="M3 6h18M7 12h10M11 18h2" />
              </svg>
              카테고리
              <span className="text-zinc-400 dark:text-zinc-500">·</span>
              <span className="text-violet-600 dark:text-violet-400">{activeCategoryLabel}</span>
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={"h-4 w-4 text-zinc-400 transition-transform " + (catOpen ? "rotate-180" : "")}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {/* 탭: 데스크탑은 항상 표시, 모바일은 catOpen 일 때만 */}
          <div id="category-filter" className={(catOpen ? "mt-2 block" : "hidden") + " sm:mt-0 sm:block"}>
            <CategoryFilter
              active={category}
              onChange={(next) => {
                setCategory(next);
                setKeyword(null); // 키워드 ↔ 카테고리는 배타적: 카테고리 누르면 오늘의 키워드 해제
                setCatOpen(false); // 모바일: 선택하면 자동으로 접어 헤더를 다시 슬림하게
              }}
              counts={counts}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* ── 오늘의 키워드 (가져온 카드 제목 빈도순 상위 5) — 칩 클릭 시 제목 필터 ── */}
        <KeywordRail
          articles={articles}
          activeLabel={keyword?.label}
          onPick={(k) => {
            setCategory("all");
            setShowBookmarksOnly(false);
            setQuery("");
            // 같은 칩 다시 누르면 해제(토글)
            setKeyword((prev) => (prev?.label === k.label ? null : { label: k.label, re: k.re }));
          }}
        />

        {usingMock && (
          <div className="mb-6 flex flex-col gap-1 rounded-2xl border-2 border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <span className="font-bold">샘플 데이터를 표시 중입니다.</span>
            <span className="text-xs text-amber-800/80 dark:text-amber-200/80">
              <code className="rounded bg-amber-900/10 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-100/10">.env.local</code> 설정 후 RSS cron 을 돌리면 실제 기사가 로드됩니다.
            </span>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="mb-5 flex items-center justify-end">
            <div
              role="tablist"
              aria-label="정렬 기준"
              className="inline-flex shrink-0 select-none items-center rounded-full border-2 border-zinc-900/10 bg-white/70 p-0.5 text-sm font-bold dark:border-white/15 dark:bg-white/5"
            >
              {SORT_OPTIONS.map((opt) => {
                const active = sortBy === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSortBy(opt.key)}
                    className={
                      "cursor-pointer rounded-full px-3.5 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] " +
                      (active
                        ? "bg-violet-600 text-white shadow-[0_4px_12px_-4px_rgba(124,58,237,0.5)]"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
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
            {sorted.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                liked={likedSet.has(article.id)}
                bookmarked={bookmarkedSet.has(article.id)}
                hydrated={hydrated}
                hot={hotIds.has(article.id)}
                likesOverride={likesOverrides.get(article.id)}
                onToggleLike={toggleLike}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-center text-xs font-medium text-zinc-500 dark:text-zinc-500">
        AI 큐레이션 · 매일 오전 8시 업데이트
      </footer>
    </div>
  );
}
