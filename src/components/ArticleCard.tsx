"use client";

import { useState } from "react";

import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/categories";
import { timeAgo } from "@/lib/time";
import type { Article } from "@/lib/types";

// 썸네일이 없을 때 보여줄 카테고리별 그라데이션 대체 이미지.
const CATEGORY_GRADIENTS: Record<Article["category"], string> = {
  Tools: "from-violet-500 via-purple-500 to-fuchsia-600",
  LLM: "from-sky-500 via-blue-500 to-indigo-600",
  Practice: "from-emerald-500 via-teal-500 to-cyan-600",
  Career: "from-amber-500 via-orange-500 to-rose-500",
  Startup: "from-rose-500 via-pink-500 to-fuchsia-600",
  Contest: "from-lime-500 via-green-500 to-emerald-600",
};

// "AI 코딩툴 (Google뉴스)" → "AI 코딩툴" 처럼 대체 이미지에 쓸 짧은 소스명.
function cleanSource(source: string): string {
  return source.replace(/\s*\((?:via\s+)?Google\s*(?:News|뉴스)\)\s*/i, "").trim() || source;
}

type Props = {
  article: Article;
  liked: boolean;
  bookmarked: boolean;
  hydrated: boolean;
  likesOverride?: number;
  onToggleLike: (id: string, currentCount: number) => void;
  onToggleBookmark: (id: string) => void;
};

export function ArticleCard({
  article,
  liked,
  bookmarked,
  hydrated,
  likesOverride,
  onToggleLike,
  onToggleBookmark,
}: Props) {
  const categoryClasses = CATEGORY_COLORS[article.category];
  const gradient = CATEGORY_GRADIENTS[article.category] ?? CATEGORY_GRADIENTS.LLM;
  // 썸네일 URL 이 없거나, 있더라도 로딩에 실패하면(핫링크 차단·404 등) 그라데이션 대체 이미지를 쓴다.
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(article.thumbnail_url) && !imgFailed;
  // article.likes_count 는 SSR 시점의 DB 값. liked 가 true 라면 그 사용자의 좋아요가 이미 포함돼 있으므로 +1 더하지 않는다.
  // 클릭 직후엔 use-likes 가 낙관적 override 를 미리 채워주므로 UI 도 즉시 반영됨.
  const displayLikes = likesOverride ?? article.likes_count;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-900/10 bg-white shadow-[0_2px_10px_-4px_rgba(15,23,42,0.1)] transition-all duration-200 hover:-translate-y-1 hover:border-zinc-900/20 hover:shadow-[0_18px_40px_-14px_rgba(124,58,237,0.4)] dark:border-white/10 dark:bg-zinc-900/70 dark:hover:border-white/20 dark:hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.7)]">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800"
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.thumbnail_url!}
            alt=""
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={
              "relative flex h-full w-full select-none flex-col items-center justify-center gap-2 bg-gradient-to-br p-4 text-center transition-transform duration-300 group-hover:scale-[1.03] " +
              gradient
            }
          >
            {/* 은은한 광택 오버레이 */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_80%_at_15%_10%,rgba(255,255,255,0.35),transparent_55%)]"
            />
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-7 w-7 text-white/90 drop-shadow"
              aria-hidden="true"
            >
              <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
              <path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" opacity="0.8" />
            </svg>
            <span className="line-clamp-2 text-sm font-semibold text-white drop-shadow-sm">
              {cleanSource(article.source)}
            </span>
          </div>
        )}
        <span
          className={
            "absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold shadow-sm ring-1 ring-inset backdrop-blur-md dark:bg-zinc-900/85 " +
            categoryClasses
          }
        >
          {CATEGORY_LABELS[article.category] ?? article.category}
        </span>
      </a>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{article.source}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.published_at}>{timeAgo(article.published_at)}</time>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-semibold leading-snug text-zinc-900 transition-colors hover:text-violet-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-zinc-100 dark:hover:text-violet-400"
        >
          {article.title}
        </a>

        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{article.summary}</p>

        <div
          className={
            "mt-auto flex select-none items-center justify-between pt-2 transition-opacity duration-200 " +
            (hydrated ? "opacity-100" : "opacity-0")
          }
          aria-hidden={!hydrated}
        >
          <button
            type="button"
            onClick={() => onToggleLike(article.id, displayLikes)}
            disabled={!hydrated}
            tabIndex={hydrated ? 0 : -1}
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 active:scale-95 " +
              (liked
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800")
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {displayLikes}
          </button>

          <button
            type="button"
            onClick={() => onToggleBookmark(article.id)}
            disabled={!hydrated}
            tabIndex={hydrated ? 0 : -1}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            className={
              "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-95 " +
              (bookmarked
                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800")
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill={bookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
