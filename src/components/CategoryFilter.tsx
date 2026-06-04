"use client";

import { CATEGORIES, CATEGORY_CHIP_ACTIVE, type CategoryId } from "@/lib/categories";

type Props = {
  active: CategoryId;
  onChange: (next: CategoryId) => void;
  counts?: Partial<Record<CategoryId, number>>;
};

export function CategoryFilter({ active, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
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
              "inline-flex h-9 select-none items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.96] " +
              (isActive
                ? CATEGORY_CHIP_ACTIVE[cat.id] + " border-2 border-transparent shadow-[0_4px_14px_-4px_rgba(0,0,0,0.3)]"
                : "border-2 border-zinc-900/10 bg-white/70 text-zinc-700 hover:border-zinc-900/25 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10")
            }
          >
            {cat.label}
            {typeof count === "number" && (
              <span
                className={
                  "rounded-full px-1.5 text-xs font-bold " +
                  (isActive
                    ? "bg-black/15 dark:bg-black/10"
                    : "bg-zinc-900/5 text-zinc-500 dark:bg-white/10 dark:text-zinc-400")
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
