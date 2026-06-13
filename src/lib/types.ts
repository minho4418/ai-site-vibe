import type { CategoryId } from "./categories";

export type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  category: Exclude<CategoryId, "all">;
  // RSS 원문 요약(피드 제공값). 폴백용.
  summary: string;
  // Groq 로 다듬은 한국어 AI 요약. 있으면 카드에서 우선 표시, 없으면 summary 폴백.
  ai_summary?: string | null;
  // Groq 가 뽑은 핵심 키워드 2~3개. 썸네일 없는 카드 커버에 큰 타이포로 표출.
  keywords?: string[] | null;
  thumbnail_url: string | null;
  published_at: string;
  likes_count: number;
  // 클릭(조회)수. views_count 컬럼/SQL 미적용 환경에선 undefined → 소비처에서 0 으로 취급.
  views_count?: number;
};
