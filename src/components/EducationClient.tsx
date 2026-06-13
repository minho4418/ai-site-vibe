"use client";

import { useMemo, useState } from "react";

import { SearchInput } from "@/components/SearchInput";
import { COURSE_CATEGORIES, COURSES, type Course, type CourseCategoryKey } from "@/lib/courses";

type TabKey = CourseCategoryKey | "all";

// 플랫폼별 배지 색(브랜드 톤). 목록에 없는 플랫폼은 중립색으로 폴백.
const PLATFORM_BADGE: Record<string, string> = {
  패스트캠퍼스: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  인프런: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  클래스101: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  유튜브: "bg-red-500/10 text-red-600 dark:text-red-400",
  Udemy: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  Anthropic: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  "deeplearning.ai": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  공개강의: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
};
const PLATFORM_BADGE_FALLBACK = "bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/10 dark:text-zinc-300";

// 정렬 기준. level-asc = 입문→중급→고급(기본), level-desc = 고급→입문,
// curated = 파일에 적어둔 추천(수동 큐레이션) 순서 그대로.
type SortKey = "level-asc" | "level-desc" | "curated";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "level-asc", label: "난이도 낮은순" },
  { key: "level-desc", label: "난이도 높은순" },
  { key: "curated", label: "추천순" },
];
const LEVEL_RANK: Record<Course["level"], number> = { 입문: 0, 중급: 1, 고급: 2 };

export function EducationClient() {
  const [tab, setTab] = useState<TabKey>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("level-asc");
  const [sortOpen, setSortOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // 카테고리 · 무료 · 태그 · 검색을 모두 AND 로 결합해 좁혀나간다.
  const filtered = useMemo<Course[]>(() => {
    const q = query.trim().toLowerCase();
    return COURSES.filter((c) => {
      if (tab !== "all" && c.category !== tab) return false;
      if (freeOnly && !c.free) return false;
      if (activeTag && !c.tags.includes(activeTag)) return false;
      if (q) {
        const haystack = `${c.title} ${c.platform} ${c.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tab, freeOnly, activeTag, query]);

  // 난이도 정렬. 동일 난이도는 Array.sort 안정성으로 추천(큐레이션) 순서를 보존한다.
  const rows = useMemo<Course[]>(() => {
    if (sort === "curated") return filtered;
    const dir = sort === "level-asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (LEVEL_RANK[a.level] - LEVEL_RANK[b.level]) * dir);
  }, [filtered, sort]);

  const toggleTag = (t: string) => setActiveTag((prev) => (prev === t ? null : t));

  return (
    <>
      <div className="mb-3 w-full max-w-[14rem]">
        {/* 본문(main)은 select-none 이라 텍스트 위에서도 i-beam 이 안 뜬다.
            검색 입력창만 select-text 로 되돌려 정상적으로 선택·편집 가능하게 한다. */}
        <SearchInput value={query} onChange={setQuery} className="select-text" />
      </div>

      <div className="mb-3 flex flex-wrap gap-1 rounded-2xl bg-zinc-900/[0.04] p-1 dark:bg-white/[0.06]">
        {COURSE_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setTab(c.key)}
            aria-pressed={tab === c.key}
            className={
              "rounded-xl px-3.5 py-1.5 text-sm font-bold transition-colors " +
              (tab === c.key
                ? "bg-violet-600 text-white shadow-[0_4px_12px_-4px_rgba(124,58,237,0.5)]"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100")
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFreeOnly((v) => !v)}
          aria-pressed={freeOnly}
          className={
            "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] " +
            (freeOnly
              ? "border-transparent bg-emerald-600 text-white shadow-[0_4px_14px_-4px_rgba(5,150,105,0.5)]"
              : "border-zinc-900/10 bg-white/70 text-zinc-600 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10")
          }
        >
          🟢 무료만 보기
        </button>

        {activeTag && (
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-sm font-bold text-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.5)] transition-transform active:scale-[0.97]"
            aria-label={`태그 필터 '${activeTag}' 해제`}
          >
            #{activeTag}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}

        {/* 메뉴/팝오버 바깥 클릭 시 닫기용 백드롭 */}
          {(sortOpen || infoOpen) && (
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => {
                setSortOpen(false);
                setInfoOpen(false);
              }}
              className="fixed inset-0 z-40 cursor-default"
            />
          )}

          {/* 정렬 커스텀 드롭다운 */}
          <div className="relative z-50">
            <button
              type="button"
              onClick={() => {
                setSortOpen((v) => !v);
                setInfoOpen(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border-2 border-zinc-900/10 bg-white/70 py-0 pl-3 pr-2.5 text-sm font-bold text-zinc-700 transition-colors hover:bg-white focus-visible:border-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              {SORT_OPTIONS.find((o) => o.key === sort)?.label}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={
                  "h-3.5 w-3.5 text-zinc-400 transition-transform duration-150 " +
                  (sortOpen ? "rotate-180" : "")
                }
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {sortOpen && (
              <ul
                role="listbox"
                className="absolute right-0 mt-1.5 w-40 overflow-hidden rounded-2xl border-2 border-zinc-900/10 bg-white p-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.28)] dark:border-white/15 dark:bg-zinc-900"
              >
                {SORT_OPTIONS.map((o) => {
                  const on = o.key === sort;
                  return (
                    <li key={o.key}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={on}
                        onClick={() => {
                          setSort(o.key);
                          setSortOpen(false);
                        }}
                        className={
                          "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-bold transition-colors " +
                          (on
                            ? "bg-violet-600 text-white"
                            : "text-zinc-600 hover:bg-violet-500/10 hover:text-violet-700 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-violet-300")
                        }
                      >
                        {o.label}
                        {on && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* 난이도 기준 설명 ⓘ */}
          <div className="relative z-50">
            <button
              type="button"
              onClick={() => {
                setInfoOpen((v) => !v);
                setSortOpen(false);
              }}
              aria-label="난이도 기준 설명"
              aria-expanded={infoOpen}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900/10 bg-white/70 text-zinc-500 transition-colors hover:bg-white hover:text-violet-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-white/15 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-violet-300"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5" />
                <path d="M12 7.5h.01" />
              </svg>
            </button>
            {infoOpen && (
              <div
                role="tooltip"
                className="absolute right-0 mt-1.5 w-max max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-zinc-900/10 bg-white p-3.5 text-left shadow-[0_16px_40px_-12px_rgba(0,0,0,0.28)] dark:border-white/15 dark:bg-zinc-900"
              >
                <p className="mb-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">난이도 기준</p>
                <ul className="flex flex-col gap-1.5 whitespace-nowrap text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  <li>
                    <b className="text-emerald-600 dark:text-emerald-400">입문</b> · 사전지식 없이 따라가요. 도구 활용 위주
                  </li>
                  <li>
                    <b className="text-amber-600 dark:text-amber-400">중급</b> · 기본 도구·개념은 안다고 전제. 실전 제작
                  </li>
                  <li>
                    <b className="text-rose-600 dark:text-rose-400">고급</b> · 코딩·시스템 설계 전제. 직접 구축
                  </li>
                </ul>
                <p className="mt-2.5 border-t border-zinc-900/10 pt-2 text-[11px] text-zinc-400 dark:border-white/10 dark:text-zinc-500">
                  ※ 운영자가 매긴 참고용 분류예요.
                </p>
              </div>
            )}
          </div>

        <span className="ml-auto text-xs tabular-nums text-zinc-400 dark:text-zinc-500">결과 {rows.length}개</span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
          조건에 맞는 강의가 없어요. 검색어나 필터를 바꿔보세요.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((c) => (
            <li key={c.url}>
              {/* stretched-link 패턴: 투명 <a> 가 카드 전체를 덮어 클릭 영역을 만들고(z-0),
                  내용은 pointer-events-none 로 클릭을 통과시킨다. 태그만 z-10 + 클릭 활성화. */}
              <div className="group relative flex h-full flex-col gap-3 rounded-2xl border-2 border-zinc-900/10 bg-white p-4 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-[0_14px_30px_-14px_rgba(124,58,237,0.4)] dark:border-white/10 dark:bg-zinc-900/70 dark:hover:border-violet-400/60">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${c.title} — ${c.platform}에서 보기`}
                  className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                />

                <div className="pointer-events-none relative z-10 flex items-center gap-2">
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold " +
                      (PLATFORM_BADGE[c.platform] ?? PLATFORM_BADGE_FALLBACK)
                    }
                  >
                    {c.platform}
                  </span>
                  {c.free && (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      무료
                    </span>
                  )}
                  <span className="ml-auto shrink-0 rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                    {c.level}
                  </span>
                </div>

                <h2 className="pointer-events-none relative z-10 line-clamp-2 grow font-bold leading-snug text-zinc-900 group-hover:text-violet-600 dark:text-zinc-100 dark:group-hover:text-violet-400">
                  {c.title}
                </h2>

                <div className="relative z-10 flex flex-wrap gap-1.5">
                  {c.tags.map((t) => {
                    const on = activeTag === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        aria-pressed={on}
                        className={
                          "rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500 " +
                          (on
                            ? "bg-violet-600 text-white"
                            : "bg-zinc-900/[0.04] text-zinc-500 hover:bg-violet-500/15 hover:text-violet-700 dark:bg-white/[0.06] dark:text-zinc-400 dark:hover:text-violet-300")
                        }
                      >
                        #{t}
                      </button>
                    );
                  })}
                </div>

                <span className="pointer-events-none relative z-10 mt-auto inline-flex items-center gap-1 text-sm font-bold text-violet-600 dark:text-violet-400">
                  바로가기
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
        큐레이션 목록 · 클릭 시 각 플랫폼 원본 강의로 이동합니다
      </p>
    </>
  );
}
