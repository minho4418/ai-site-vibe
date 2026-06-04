// 한국 실무 개발자 관점으로 재편한 카테고리.
// 개발툴 / 모델·LLM / 실무·구축 / 커리어 / 창업 / 공모전
export const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "Tools", label: "개발툴" },
  { id: "LLM", label: "모델·LLM" },
  { id: "Practice", label: "실무·구축" },
  { id: "Career", label: "커리어" },
  { id: "Startup", label: "창업" },
  { id: "Contest", label: "공모전" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

// id → 한국어 라벨. ArticleCard 칩 등에서 사용.
export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
) as Record<CategoryId, string>;

export const CATEGORY_COLORS: Record<Exclude<CategoryId, "all">, string> = {
  Tools: "bg-violet-500/15 text-violet-600 ring-violet-500/30 dark:text-violet-300",
  LLM: "bg-sky-500/15 text-sky-600 ring-sky-500/30 dark:text-sky-300",
  Practice: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30 dark:text-emerald-300",
  Career: "bg-amber-500/15 text-amber-600 ring-amber-500/30 dark:text-amber-300",
  Startup: "bg-rose-500/15 text-rose-600 ring-rose-500/30 dark:text-rose-300",
  Contest: "bg-lime-500/15 text-lime-600 ring-lime-500/30 dark:text-lime-300",
};
