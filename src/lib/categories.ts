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

// 칩 배경은 ArticleCard 에서 흰/검정 반투명으로 통일하고, 카테고리는 글자색·링 색상으로만 구분한다.
// (이미지 위에 얹히는 칩이라 채도가 강하지 않으면 그라데이션 썸네일에 가려진다.)
// 필터 칩이 '선택됨' 상태일 때의 비비드 배경색 (카테고리별 캔디 컬러).
export const CATEGORY_CHIP_ACTIVE: Record<CategoryId, string> = {
  all: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
  Tools: "bg-violet-600 text-white",
  LLM: "bg-sky-600 text-white",
  Practice: "bg-emerald-600 text-white",
  Career: "bg-amber-400 text-zinc-900",
  Startup: "bg-rose-600 text-white",
  Contest: "bg-lime-500 text-zinc-900",
};

export const CATEGORY_COLORS: Record<Exclude<CategoryId, "all">, string> = {
  Tools: "text-violet-700 ring-violet-500/40 dark:text-violet-300",
  LLM: "text-sky-700 ring-sky-500/40 dark:text-sky-300",
  Practice: "text-emerald-700 ring-emerald-500/40 dark:text-emerald-300",
  Career: "text-amber-700 ring-amber-500/40 dark:text-amber-300",
  Startup: "text-rose-700 ring-rose-500/40 dark:text-rose-300",
  Contest: "text-lime-700 ring-lime-500/40 dark:text-lime-300",
};
