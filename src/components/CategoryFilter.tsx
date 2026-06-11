"use client";

import { CATEGORIES, CATEGORY_CHIP_ACTIVE, type CategoryId } from "@/lib/categories";

type Props = {
  active: CategoryId;
  onChange: (next: CategoryId) => void;
  counts?: Partial<Record<CategoryId, number>>;
};

export function CategoryFilter({ active, onChange, counts }: Props) {
  return (
    // 세그먼트 트랙: 카테고리 탭을 하나의 인셋 바로 묶어 '필터 그룹'으로 읽히게 한다.
    // (우상단 액션 버튼 = 테두리 필 / 여기 = 트랙 안 세그먼트 → 위계 구분)
    <div className="flex flex-wrap gap-1 rounded-2xl border border-zinc-900/[0.06] bg-zinc-900/[0.035] p-1 dark:border-white/[0.06] dark:bg-white/[0.05]">
      {CATEGORIES.map((cat) => {
        const isActive = cat.id === active;
        const count = counts?.[cat.id];
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            aria-pressed={isActive}
            className={
              "inline-flex h-8 select-none items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.96] " +
              (isActive
                ? CATEGORY_CHIP_ACTIVE[cat.id] + " shadow-[0_3px_10px_-4px_rgba(0,0,0,0.35)]"
                : "text-zinc-500 hover:bg-white/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100")
            }
          >
            {cat.label}
            {typeof count === "number" && (
              <span
                className={
                  "rounded-full px-1.5 text-xs font-bold " +
                  (isActive
                    ? "bg-black/15 dark:bg-black/10"
                    : "bg-zinc-900/[0.06] text-zinc-500 dark:bg-white/10 dark:text-zinc-400")
                }
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
