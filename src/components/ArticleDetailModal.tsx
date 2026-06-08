"use client";

import { useEffect, useState } from "react";

type DetailSummary = { tldr: string; points: string[] };
type FetchState =
  | { status: "loading" }
  | { status: "ok"; summary: DetailSummary }
  // no_body: 본문을 못 가져옴(영구). gen_failed/그 외: 일시적(rate limit 등) → 재시도 안내.
  | { status: "unavailable"; permanent: boolean }
  | { status: "error" };

type Props = {
  articleId: string;
  title: string;
  source: string;
  url: string;
  onClose: () => void;
};

// "✦ AI 요약" 클릭 시 뜨는 모달. 마운트되면 /api/article-summary 를 호출해
// 기사 본문 기반 상세 요약(tldr + 핵심 포인트)을 받아 보여준다.
export function ArticleDetailModal({ articleId, title, source, url, onClose }: Props) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/article-summary?id=${encodeURIComponent(articleId)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (!alive) return;
        if (data.status === "ok" && data.summary) {
          setState({ status: "ok", summary: data.summary });
        } else if (data.status === "unavailable") {
          // no_body/no_api_key 는 영구적, gen_failed(rate limit 등)는 일시적으로 본다.
          setState({ status: "unavailable", permanent: data.reason !== "gen_failed" });
        } else {
          setState({ status: "error" });
        }
      } catch {
        if (alive) setState({ status: "error" });
      }
    })();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [articleId]);

  // Esc 로 닫기 + 모달 열려있는 동안 배경 스크롤 잠금.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="기사 AI 상세 요약"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-900/10 bg-white shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900 sm:rounded-2xl"
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200/80 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
              <span aria-hidden="true">✦</span> AI 상세 요약
            </div>
            <h2 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{source}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto px-5 py-4">
          {state.status === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500" />
              본문을 읽고 요약하는 중…
            </div>
          )}

          {state.status === "ok" && (
            <div className="flex flex-col gap-4">
              <p className="rounded-xl bg-violet-500/8 px-4 py-3 text-sm font-medium leading-relaxed text-zinc-800 ring-1 ring-inset ring-violet-500/15 dark:text-zinc-100">
                {state.summary.tldr}
              </p>
              <ul className="flex flex-col gap-2.5">
                {state.summary.points.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.status === "unavailable" && (
            <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {state.permanent ? (
                <>
                  이 기사는 본문을 가져올 수 없어 상세 요약을 만들지 못했어요.
                  <br />
                  원문에서 직접 확인해 주세요.
                </>
              ) : (
                <>
                  지금은 요약 생성이 잠시 지연되고 있어요.
                  <br />
                  잠시 후 다시 시도해 주세요.
                </>
              )}
            </div>
          )}

          {state.status === "error" && (
            <div className="py-8 text-center text-sm text-rose-500">
              요약을 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.
            </div>
          )}
        </div>

        {/* 푸터: 원문 링크 */}
        <div className="border-t border-zinc-200/80 px-5 py-3 dark:border-white/10">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 transition-colors hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
          >
            원문 보기
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
