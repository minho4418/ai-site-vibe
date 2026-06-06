import type { CategoryId } from "./categories";

export type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  category: Exclude<CategoryId, "all">;
  summary: string;
  thumbnail_url: string | null;
  published_at: string;
  likes_count: number;
  // 클릭(조회)수. views_count 컬럼/SQL 미적용 환경에선 undefined → 소비처에서 0 으로 취급.
  views_count?: number;
};
