"use client";

import { CATEGORY_COLORS } from "@/lib/categories";
import { timeAgo } from "@/lib/time";
import type { Article } from "@/lib/types";

type Props = {
  article: Article;
  liked: boolean;
  bookmarked: boolean;
  hydrated: boolean;
  likesOverride?: number;
  onToggleLike: (id: string) => void;
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
  const displayLikes = likesOverride ?? article.likes_count + (liked ? 1 : 0);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_-1px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800"
      >
        {article.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
        <span
          className={
            "absolute left-3 top-3 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset backdrop-blur-sm " +
            categoryClasses
          }
        >
          {article.category}
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
            "mt-auto flex items-center justify-between pt-2 transition-opacity duration-200 " +
            (hydrated ? "opacity-100" : "opacity-0")
          }
          aria-hidden={!hydrated}
        >
          <button
            type="button"
            onClick={() => onToggleLike(article.id)}
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
