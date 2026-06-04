import type { CategoryId } from "./categories";

export type FeedSource = {
  url: string;
  source: string;
  /** 키워드 분류(classifyCategory)가 실패했을 때 쓰는 fallback 카테고리. */
  category: Exclude<CategoryId, "all">;
  /** Max items to ingest per run. Defaults to 15. */
  limit?: number;
  /** 종합 피드(개발 뉴스 전반)에서 AI 관련 글만 수집할 때 true. */
  aiOnly?: boolean;
};

// 한국어 AI 뉴스는 Google News 검색 RSS(한국어 로캘)로 가져온다.
const googleNewsKR = (query: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;

// 실제 카테고리는 ingest 단계에서 제목/요약 키워드(classifyCategory)로 다시 정해지고,
// 여기 category 값은 키워드에 안 걸릴 때의 fallback 일 뿐이다.
// URL이 죽으면 ingest 라우트가 그 피드만 스킵하고 계속 진행함.
export const FEEDS: FeedSource[] = [
  // ── 한국 개발자 커뮤니티 (AI 관련 글만 필터링) ───────────────────────
  { url: "https://news.hada.io/rss/news", source: "GeekNews", category: "Practice", aiOnly: true, limit: 30 },
  { url: "https://yozm.wishket.com/magazine/feed/", source: "요즘IT", category: "Practice", aiOnly: true, limit: 15 },

  // ── 한국어 AI 뉴스 (Google News 검색, 카테고리별 키워드 스코프) ──────
  {
    url: googleNewsKR('"Claude Code" OR Cursor OR "GitHub Copilot" OR Codex OR "바이브 코딩" OR "AI 코딩"'),
    source: "AI 코딩툴 (Google뉴스)",
    category: "Tools",
    limit: 12,
  },
  {
    url: googleNewsKR('GPT OR Claude OR Gemini OR LLM OR "거대언어모델" 인공지능 모델'),
    source: "모델 동향 (Google뉴스)",
    category: "LLM",
    limit: 12,
  },
  {
    url: googleNewsKR('RAG OR "AI 에이전트" OR MCP OR 파인튜닝 OR 임베딩 OR "도입 사례"'),
    source: "AI 실무 (Google뉴스)",
    category: "Practice",
    limit: 12,
  },
  {
    url: googleNewsKR('"개발자 채용" OR "AI 개발자" OR "개발자 연봉" OR "IT 이직" OR "개발자 일자리"'),
    source: "개발자 채용 (Google뉴스)",
    category: "Career",
    limit: 10,
  },

  // ── 영어 원문 소스 (한/영 균형) ──────────────────────────────────
  { url: "https://openai.com/news/rss.xml", source: "OpenAI", category: "LLM" },
  // Anthropic 공식 RSS는 제공 안 함 → Google News 검색 RSS 로 대체
  {
    url: "https://news.google.com/rss/search?q=%22Anthropic%22+OR+%22Claude%22&hl=en-US&gl=US&ceid=US:en",
    source: "Anthropic (via Google News)",
    category: "LLM",
    limit: 10,
  },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch", category: "LLM" },
  { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", source: "The Verge", category: "LLM" },
  // Hacker News (AI/코딩툴 키워드, 점수 20+ 만)
  {
    url: "https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude+OR+Cursor+OR+Copilot&points=20",
    source: "Hacker News",
    category: "Tools",
    limit: 20,
  },
];
