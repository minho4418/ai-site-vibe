export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "LLM", label: "LLM" },
  { id: "Vision", label: "Vision" },
  { id: "Robotics", label: "Robotics" },
  { id: "Research", label: "Research" },
  { id: "Industry", label: "Industry" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_COLORS: Record<Exclude<CategoryId, "all">, string> = {
  LLM: "bg-violet-500/15 text-violet-600 ring-violet-500/30 dark:text-violet-300",
  Vision: "bg-sky-500/15 text-sky-600 ring-sky-500/30 dark:text-sky-300",
  Robotics: "bg-amber-500/15 text-amber-600 ring-amber-500/30 dark:text-amber-300",
  Research: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30 dark:text-emerald-300",
  Industry: "bg-rose-500/15 text-rose-600 ring-rose-500/30 dark:text-rose-300",
};
