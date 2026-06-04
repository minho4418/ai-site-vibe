import type { CategoryId } from "./categories";

export type FeedSource = {
  url: string;
  source: string;
  category: Exclude<CategoryId, "all">;
  /** Max items to ingest per run. Defaults to 15. */
  limit?: number;
};

// 카테고리 매핑은 피드 URL → 카테고리 1:1.
// 필요하면 자유롭게 추가/삭제. URL이 죽으면 ingest 라우트가 그 피드만 스킵하고 계속 진행함.
export const FEEDS: FeedSource[] = [
  // ── 기업 연구 블로그 ──────────────────────────────────────────────
  { url: "https://openai.com/news/rss.xml", source: "OpenAI", category: "Industry" },
  { url: "https://blog.research.google/feeds/posts/default", source: "Google Research", category: "Research" },
  // Meta AI 공식 RSS 가 자주 죽어서 Google News 검색 RSS 로 대체.
  {
    url: "https://news.google.com/rss/search?q=%22Meta+AI%22+OR+%22Llama%22&hl=en-US&gl=US&ceid=US:en",
    source: "Meta AI (via Google News)",
    category: "Research",
    limit: 10,
  },
  // Anthropic 공식 RSS는 제공 안 함 → Google News 검색 RSS 로 대체
  {
    url: "https://news.google.com/rss/search?q=%22Anthropic%22+OR+%22Claude%22&hl=en-US&gl=US&ceid=US:en",
    source: "Anthropic (via Google News)",
    category: "Industry",
    limit: 10,
  },

  // ── 테크 매체 (AI 카테고리) ───────────────────────────────────────
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch", category: "Industry" },
  { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", source: "The Verge", category: "Industry" },
  { url: "https://www.wired.com/feed/tag/ai/latest/rss", source: "Wired", category: "Industry" },

  // ── Hacker News (AI 키워드 필터, 점수 20+ 만) ─────────────────────
  {
    url: "https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude+OR+Gemini+OR+OpenAI+OR+Anthropic&points=20",
    source: "Hacker News",
    category: "LLM",
    limit: 20,
  },
];
