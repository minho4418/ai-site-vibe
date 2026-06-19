// 한국 실무 개발자 관점으로 재편한 카테고리.
// 개발툴 / 모델·LLM / 오픈소스 / 연구·논문 / 실무·구축 / 인프라·HW / 창업 / 공모전
export const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "Tools", label: "개발툴" },
  { id: "LLM", label: "모델·LLM" },
  { id: "OpenSource", label: "오픈소스" },
  { id: "Research", label: "연구·논문" },
  { id: "Practice", label: "실무·구축" },
  { id: "Infra", label: "인프라·HW" },
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
  OpenSource: "bg-fuchsia-600 text-white",
  Research: "bg-cyan-600 text-white",
  Practice: "bg-emerald-600 text-white",
  Infra: "bg-orange-600 text-white",
  Startup: "bg-rose-600 text-white",
  Contest: "bg-lime-500 text-zinc-900",
};

export const CATEGORY_COLORS: Record<Exclude<CategoryId, "all">, string> = {
  Tools: "text-violet-700 ring-violet-500/40 dark:text-violet-300",
  LLM: "text-sky-700 ring-sky-500/40 dark:text-sky-300",
  OpenSource: "text-fuchsia-700 ring-fuchsia-500/40 dark:text-fuchsia-300",
  Research: "text-cyan-700 ring-cyan-500/40 dark:text-cyan-300",
  Practice: "text-emerald-700 ring-emerald-500/40 dark:text-emerald-300",
  Infra: "text-orange-700 ring-orange-500/40 dark:text-orange-300",
  Startup: "text-rose-700 ring-rose-500/40 dark:text-rose-300",
  Contest: "text-lime-700 ring-lime-500/40 dark:text-lime-300",
};

// 썸네일 없는 카드 커버의 카테고리별 기준 색조(HSL hue). 위 색상 맵(칩/링)과 같은 모듈에 모아,
// 카테고리를 추가할 때 색을 한 파일에서 전부 채우게 한다(분산돼 한 곳을 빠뜨리는 사고 방지).
export const CATEGORY_HUE: Record<Exclude<CategoryId, "all">, number> = {
  Tools: 265,
  LLM: 205,
  OpenSource: 300,
  Research: 188,
  Practice: 158,
  Infra: 25,
  Startup: 345,
  Contest: 95,
};

// 구(舊) 카테고리·오타 등 알 수 없는 category 값이 들어오면 이 값으로 폴백.
export const FALLBACK_CATEGORY: Exclude<CategoryId, "all"> = "LLM";

const CONCRETE_CATEGORY_IDS = new Set<string>(
  CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id),
);

// DB 의 category 문자열을 알려진 카테고리로 정규화한다(서버 articles.ts·클라 articles-client.ts 공용).
// 알 수 없으면 FALLBACK_CATEGORY 로 — 한 곳에 둬서 서버/클라 규칙이 어긋나지 않게 한다.
export function normalizeCategory(raw: string): Exclude<CategoryId, "all"> {
  return (CONCRETE_CATEGORY_IDS.has(raw) ? raw : FALLBACK_CATEGORY) as Exclude<CategoryId, "all">;
}
