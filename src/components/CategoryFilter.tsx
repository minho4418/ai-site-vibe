"use client";

import { CATEGORIES, type CategoryId } from "@/lib/categories";

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
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[0.97] " +
              (isActive
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800")
            }
          >
            {cat.label}
            {typeof count === "number" && (
              <span
                className={
                  "rounded-full px-1.5 text-xs " +
                  (isActive
                    ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400")
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
