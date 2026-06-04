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
};
