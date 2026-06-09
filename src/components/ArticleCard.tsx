"use client";

import { useState } from "react";

import { ArticleDetailModal } from "@/components/ArticleDetailModal";
import { recordView } from "@/lib/articles-client";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/categories";
import { isFresh, timeAgo } from "@/lib/time";
import type { Article } from "@/lib/types";

// Google News 리다이렉트 URL 은 본문을 못 가져온다(상세 요약 불가) → 그런 기사엔 상세 버튼을 숨긴다.
function canFetchBody(pageUrl: string): boolean {
  try {
    return new URL(pageUrl).hostname !== "news.google.com";
  } catch {
    return false;
  }
}

// 썸네일이 없을 때 보여줄 카테고리별 그라데이션 대체 이미지.
const CATEGORY_GRADIENTS: Record<Article["category"], string> = {
  Tools: "from-violet-500 via-purple-500 to-fuchsia-600",
  LLM: "from-sky-500 via-blue-500 to-indigo-600",
  OpenSource: "from-fuchsia-500 via-pink-500 to-purple-600",
  Research: "from-cyan-500 via-teal-500 to-sky-600",
  Practice: "from-emerald-500 via-teal-500 to-cyan-600",
  Infra: "from-orange-500 via-red-500 to-amber-600",
  Career: "from-amber-500 via-orange-500 to-rose-500",
  Startup: "from-rose-500 via-pink-500 to-fuchsia-600",
  Contest: "from-lime-500 via-green-500 to-emerald-600",
};

// "AI 코딩툴 (Google뉴스)" → "AI 코딩툴" 처럼 대체 이미지에 쓸 짧은 소스명.
function cleanSource(source: string): string {
  return source.replace(/\s*\((?:via\s+)?Google\s*(?:News|뉴스)\)\s*/i, "").trim() || source;
}

// 출처 도메인의 파비콘(구글 무료 서비스). 신뢰·식별 신호 — The Rundown/Neuron 의 아바타 역할.
function faviconUrl(pageUrl: string): string | null {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(pageUrl).hostname}&sz=64`;
  } catch {
    return null;
  }
}

// 🆕NEW = "방금 들어온" 3시간 (design-system.md §4).
// 이 사이트는 매일 cron 으로 최근 24h 기사를 한 번에 수집 → 24h 창이면 모든 카드가 NEW 라 무의미하다.
// 그래서 수집 직후 갓 올라온 기사에만 잠깐 켜지도록 3h 로 좁힌다(평소엔 0개 = 노이즈 없음).
// 🔥인기는 HomeClient 가 좋아요 상대 상위로 계산해 hot prop 으로 내려준다.
const NEW_WINDOW_MS = 3 * 60 * 60 * 1000;

type Props = {
  article: Article;
  liked: boolean;
  bookmarked: boolean;
  hydrated: boolean;
  hot: boolean;
  likesOverride?: number;
  onToggleLike: (id: string, currentCount: number) => void;
  onToggleBookmark: (id: string) => void;
};

export function ArticleCard({
  article,
  liked,
  bookmarked,
  hydrated,
  hot,
  likesOverride,
  onToggleLike,
  onToggleBookmark,
}: Props) {
  const categoryClasses = CATEGORY_COLORS[article.category];
  const gradient = CATEGORY_GRADIENTS[article.category] ?? CATEGORY_GRADIENTS.LLM;
  // 썸네일 URL 이 없거나, 있더라도 로딩에 실패하면(핫링크 차단·404 등) 그라데이션 대체 이미지를 쓴다.
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(article.thumbnail_url) && !imgFailed;
  // 클릭 시 조회수를 즉시 +1 로 보여주기 위한 낙관적 플래그(좋아요 override 와 같은 사고방식).
  // 실제 DB 증가는 recordView 가 fire-and-forget 으로 처리하고, 화면엔 바로 반영한다.
  const [viewedLocally, setViewedLocally] = useState(false);
  // article.likes_count 는 SSR 시점의 DB 값. liked 가 true 라면 그 사용자의 좋아요가 이미 포함돼 있으므로 +1 더하지 않는다.
  // 클릭 직후엔 use-likes 가 낙관적 override 를 미리 채워주므로 UI 도 즉시 반영됨.
  const displayLikes = likesOverride ?? article.likes_count;

  // 배지: 인기(hot)는 HomeClient 가 상위로 판정해 내려주고, 신선도(isNew)는 발행 시각으로 판단.
  const isHot = hot;
  const isNew = isFresh(article.published_at, NEW_WINDOW_MS);

  const views = (article.views_count ?? 0) + (viewedLocally ? 1 : 0);
  const favicon = faviconUrl(article.url);

  // 본문 요약: Groq 한국어 요약(ai_summary)이 있으면 우선 쓰고, 없으면 RSS 원문 요약으로 폴백.
  const summaryText = article.ai_summary?.trim() || article.summary;
  // 상세 요약 모달: 본문을 가져올 수 있는 기사(Google뉴스 제외)에서만 버튼 노출.
  const [detailOpen, setDetailOpen] = useState(false);
  const canDetail = canFetchBody(article.url);

  // 카드(기사) 열 때: 조회수 낙관적 +1 + DB 증가(둘 다 세션당 1회만 효과).
  const handleOpen = () => {
    setViewedLocally(true);
    recordView(article.id);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-900/10 bg-white shadow-[0_2px_10px_-4px_rgba(15,23,42,0.1)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-zinc-900/20 hover:shadow-[0_18px_40px_-14px_rgba(124,58,237,0.4)] dark:border-white/10 dark:bg-zinc-900/70 dark:hover:border-white/20 dark:hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.7)]">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleOpen}
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
          // 썸네일이 없을 때: '가짜 사진'이 아니라 의도된 에디토리얼 커버.
          // 카테고리 라벨을 거대 워터마크로 깔고, 그레인 + 소스명을 얹어 잡지 섹션 표지처럼 보이게 한다.
          <div
            className={
              "grain relative flex h-full w-full select-none flex-col justify-end overflow-hidden bg-gradient-to-br p-4 transition-transform duration-300 group-hover:scale-[1.03] " +
              gradient
            }
          >
            {/* 광택 오버레이 */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_80%_at_15%_10%,rgba(255,255,255,0.35),transparent_55%)]"
            />
            {/* 거대 카테고리 워터마크 */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-4 -right-1 font-display text-[4.25rem] leading-none text-white/15"
            >
              {CATEGORY_LABELS[article.category] ?? article.category}
            </span>
            {/* 소스명 (표지 타이틀) */}
            <span className="relative line-clamp-2 font-display text-xl leading-tight text-white drop-shadow-sm">
              {cleanSource(article.source)}
            </span>
          </div>
        )}
        <span
          className={
            "absolute left-3 top-3 inline-flex select-none items-center rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold shadow-sm ring-1 ring-inset backdrop-blur-md dark:bg-zinc-900/85 " +
            categoryClasses
          }
        >
          {CATEGORY_LABELS[article.category] ?? article.category}
        </span>

        {/* 우상단 신호 배지: 🔥인기 / 🆕NEW (design-system.md §4) */}
        {(isHot || isNew) && (
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            {isHot && (
              <span className="inline-flex select-none items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-[0_2px_8px_-2px_rgba(249,115,22,0.7)]">
                🔥 인기
              </span>
            )}
            {isNew && (
              <span className="inline-flex select-none items-center rounded-full bg-violet-600/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                New
              </span>
            )}
          </div>
        )}

        {/* 호버 시 '읽기 →' 클릭 유도 오버레이 (opacity·translate 만 트랜지션) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-1 items-center justify-end gap-1 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-3 pb-2.5 pt-10 text-xs font-bold text-white opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-y-0 group-hover:opacity-100"
        >
          읽기 <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </span>
      </a>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={favicon}
              alt=""
              width={16}
              height={16}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="h-4 w-4 shrink-0 rounded-sm"
            />
          )}
          <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">{article.source}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.published_at} className="shrink-0">
            {timeAgo(article.published_at)}
          </time>
          {views > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="shrink-0 tabular-nums">조회 {views.toLocaleString()}</span>
            </>
          )}
        </div>

        {/* 제목+요약을 한 링크로 묶어 클릭 영역을 넓힌다(카드 전체 클릭 대체 — 하단 버튼과 중첩 회피). */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpen}
          className="group/read flex flex-col gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <h3 className="text-base font-semibold leading-snug text-zinc-900 underline-offset-2 decoration-violet-400 decoration-2 transition-colors group-hover/read:text-violet-600 group-hover/read:underline dark:text-zinc-100 dark:group-hover/read:text-violet-400">
            {article.title}
          </h3>
          <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{summaryText}</p>
        </a>

        {/* 상세 요약 보기: 클릭 시 본문 기반 상세 요약을 모달로 띄운다(Google뉴스 기사는 숨김). */}
        {canDetail && (
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="inline-flex w-fit cursor-pointer select-none items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-95 dark:text-violet-300"
          >
            <span aria-hidden="true">✦</span> AI 요약 상세보기
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        )}

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

      {detailOpen && (
        <ArticleDetailModal
          articleId={article.id}
          title={article.title}
          source={article.source}
          url={article.url}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </article>
  );
}
