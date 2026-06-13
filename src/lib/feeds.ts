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
  /**
   * true 면 키워드 재분류(classifyCategory)를 건너뛰고 category 를 그대로 쓴다.
   * 소스 자체가 곧 카테고리인 경우용(예: GitHub 트렌딩 = 전부 OpenSource).
   */
  forceCategory?: boolean;
};

// 한국어 AI 뉴스는 Google News 검색 RSS(한국어 로캘)로 가져온다.
const googleNewsKR = (query: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;

// 실제 카테고리는 ingest 단계에서 제목/요약 키워드(classifyCategory)로 다시 정해지고,
// 여기 category 값은 키워드에 안 걸릴 때의 fallback 일 뿐이다.
// URL이 죽으면 ingest 라우트가 그 피드만 스킵하고 계속 진행함.
export const FEEDS: FeedSource[] = [
  // ── 한국 개발자/스타트업 커뮤니티 (AI 관련 글만 필터링) ────────────────
  { url: "https://news.hada.io/rss/news", source: "GeekNews", category: "Practice", aiOnly: true, limit: 30 },
  // 요즘IT·벤처스퀘어 제거: 두 매체 모두 "무단 전재·복사·배포 금지"를 명시한 곳이라
  // 상업 운영 시 저작권 위험이 가장 큼. 국내 창업/실무 소식은 아래 Google News(창업·실무) 피드로 커버된다.

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
    url: googleNewsKR('"AI 스타트업" OR "AI 창업" OR "테크 스타트업" OR "스타트업 투자 유치" OR 액셀러레이터'),
    source: "창업·스타트업 (Google뉴스)",
    category: "Startup",
    limit: 10,
  },
  {
    url: googleNewsKR('"AI 공모전" OR "개발 공모전" OR 해커톤 OR 아이디어톤 OR "AI 경진대회" OR "개발자 챌린지" OR 캐글'),
    source: "공모전·해커톤 (Google뉴스)",
    category: "Contest",
    limit: 10,
  },
  {
    url: googleNewsKR('엔비디아 GPU OR "AI 반도체" OR "AI 칩" OR "데이터센터" OR "추론 비용" OR HBM OR 파운드리'),
    source: "AI 인프라 (Google뉴스)",
    category: "Infra",
    limit: 10,
  },
  {
    url: googleNewsKR('"AI 논문" OR "AI 연구" OR 딥마인드 OR "AI 벤치마크" OR "AI 학회" OR "거대언어모델 연구"'),
    source: "AI 연구 (Google뉴스)",
    category: "Research",
    limit: 10,
  },
  {
    url: googleNewsKR('"오픈소스 AI" OR "오픈 모델" OR 허깅페이스 OR "공개 모델" OR "오픈 웨이트" OR 라마 모델'),
    source: "오픈소스 AI (Google뉴스)",
    category: "OpenSource",
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

  // ── 해외 AI 전문 매체·연구 블로그 (직링크 → 본문/og:image 양호) ──────────
  // AI 전용 피드라 aiOnly 불필요. 카테고리는 classifyCategory 가 제목으로 재분류, 아래는 fallback.
  { url: "https://blog.google/technology/ai/rss/", source: "Google AI", category: "Research", limit: 6 },
  { url: "https://deepmind.google/blog/rss.xml", source: "Google DeepMind", category: "Research", limit: 6 },
  { url: "https://huggingface.co/blog/feed.xml", source: "Hugging Face", category: "OpenSource", limit: 8 },
  // ── 공식 기업/연구 블로그 (저작권 안전: 홍보 목적 배포 + 최신·고품질) ─────────────
  // 모두 RSS 생존 확인됨(2026-06). 회사/기관이 직접 배포 → 헤드라인+요약+링크 모델에 우호적.
  { url: "https://research.google/blog/rss/", source: "Google Research", category: "Research", aiOnly: true, limit: 6 },
  // NVIDIA 블로그는 게이밍 등 비-AI 글도 섞여 aiOnly 로 필터.
  { url: "https://blogs.nvidia.com/feed/", source: "NVIDIA 블로그", category: "Infra", aiOnly: true, limit: 8 },
  { url: "https://news.microsoft.com/source/topics/ai/feed/", source: "Microsoft AI", category: "LLM", limit: 6 },
  { url: "https://aws.amazon.com/blogs/machine-learning/feed/", source: "AWS ML", category: "Practice", aiOnly: true, limit: 6 },
  { url: "https://bair.berkeley.edu/blog/feed.xml", source: "Berkeley BAIR", category: "Research", limit: 4 },
  // GitHub 일간 트렌딩(전 언어). repo 는 본질적으로 오픈소스라 forceCategory 로 OpenSource 고정.
  // aiOnly 로 AI 관련 repo만 남김(요즘 트렌딩은 대부분 AI). 정적 호스팅(GitHub Pages) RSS — 죽으면 graceful 스킵.
  {
    url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml",
    source: "GitHub 트렌딩",
    category: "OpenSource",
    aiOnly: true,
    forceCategory: true,
    limit: 12,
  },
  // MIT Tech Review 제거: 본문이 페이월이라 원문 링크를 눌러도 못 읽고(UX 저하),
  // 재사용 제약도 큰 매체. 연구 카테고리는 Google Research·BAIR 로 대체.
  { url: "https://venturebeat.com/category/ai/feed/", source: "VentureBeat", category: "LLM", limit: 8 },
  { url: "https://arstechnica.com/ai/feed/", source: "Ars Technica", category: "LLM", limit: 8 },
  // 고신호 개인 블로그/뉴스레터 (AI 엔지니어들이 실제로 보는 곳)
  { url: "https://simonwillison.net/atom/everything/", source: "Simon Willison", category: "Tools", limit: 8 },
  { url: "https://www.latent.space/feed", source: "Latent Space", category: "Practice", limit: 6 },

  // ── 국내 기업 기술블로그 (종합 개발 피드 → aiOnly 로 AI 글만 수집) ──────
  // 실무 관점의 AI 적용 사례가 주력이라 fallback 은 Practice. 대부분 비-AI라 매 실행 0~2건 기여.
  { url: "https://d2.naver.com/d2.atom", source: "네이버 D2", category: "Practice", aiOnly: true, limit: 15 },
  { url: "https://tech.kakao.com/feed/", source: "카카오 기술블로그", category: "Practice", aiOnly: true, limit: 10 },
  { url: "https://techblog.woowahan.com/feed/", source: "우아한형제들", category: "Practice", aiOnly: true, limit: 10 },
  { url: "https://toss.tech/rss.xml", source: "토스 기술블로그", category: "Practice", aiOnly: true, limit: 10 },
  { url: "https://medium.com/feed/daangn", source: "당근 기술블로그", category: "Practice", aiOnly: true, limit: 10 },
  { url: "https://techblog.lycorp.co.jp/ko/feed/index.xml", source: "LINE 기술블로그", category: "Practice", aiOnly: true, limit: 15 },
];
