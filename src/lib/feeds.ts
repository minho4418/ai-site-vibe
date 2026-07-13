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
  // The Verge 제거: CDN/WAF 가 모든 자동화 UA(봇·브라우저 UA 무관)를 403으로 차단 — Vercel 서버 IP 차단으로 실제 수집 불가.
  // Hacker News (AI/코딩툴 키워드, 점수 20+ 만)
  {
    url: "https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude+OR+Cursor+OR+Copilot&points=20",
    source: "Hacker News",
    category: "Tools",
    limit: 20,
  },

  // ── 해외 AI 전문 매체·연구 블로그 (직링크 → 본문/og:image 양호) ──────────
  // AI 전용 피드라 aiOnly 불필요. 카테고리는 classifyCategory 가 제목으로 재분류, 아래는 fallback.
  // 구 URL(blog.google/technology/ai/rss/)은 영구 301로 아래 URL로 이전됨(2026-06 확인).
  { url: "https://blog.google/innovation-and-ai/technology/ai/rss/", source: "Google AI", category: "Research", limit: 6 },
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
  // VentureBeat AI 카테고리 피드(venturebeat.com/category/ai/feed/)는 2026-05 이후 업데이트 멈춤(stale) →
  // 메인 피드 + aiOnly 로 전환. VentureBeat 는 광범위한 엔터프라이즈/AI 매체라 aiOnly 필터가 적합하다.
  { url: "https://venturebeat.com/feed/", source: "VentureBeat", category: "LLM", aiOnly: true, limit: 8 },
  // Ars Technica 제거: Cloudflare WAF 가 모든 자동화 요청(봇·브라우저 UA 무관)을 403으로 차단 — Vercel IP 차단으로 수집 불가.
  // 고신호 개인 블로그/뉴스레터 (AI 엔지니어들이 실제로 보는 곳)
  { url: "https://simonwillison.net/atom/everything/", source: "Simon Willison", category: "Tools", limit: 8 },
  { url: "https://www.latent.space/feed", source: "Latent Space", category: "Practice", limit: 6 },
  // Import AI — Jack Clark(Anthropic 공동창업자) 주간 AI 리서치 뉴스레터. 무료·공개 배포, 저작권 제한 없음.
  { url: "https://jack-clark.net/feed/", source: "Import AI", category: "Research", limit: 6 },
  // Interconnects — Nathan Lambert(AI 연구자) Substack. 프론티어 모델·추론·에이전트 심층 분석. 71K+ 구독, 무료 공개.
  { url: "https://www.interconnects.ai/feed", source: "Interconnects", category: "Research", limit: 6 },
  // Mistral AI 공식 블로그. 오픈웨이트·클로즈드 모델 모두 출시하는 프론티어 랩. 홍보 목적 자발적 배포 → 저작권 안전.
  // RSS 2026-07-02 기준 활성(leanstral-1.5, OCR 4 등). URL: https://mistral.ai/rss.xml (공식 확인).
  { url: "https://mistral.ai/rss.xml", source: "Mistral AI", category: "LLM", limit: 6 },
  // PyTorch 공식 블로그. Meta 지원 오픈소스 ML 프레임워크. 릴리스 노트·최적화 기법·분산 학습 기술 등.
  // 홍보 목적 공개 배포 → 저작권 안전. 2026-07-10 기준 활성(PyTorch 2.13 릴리스 등).
  { url: "https://pytorch.org/blog/feed.xml", source: "PyTorch Blog", category: "OpenSource", limit: 6 },
  // Lilian Weng 블로그. 前 OpenAI 리서치 VP. 프론티어 AI 연구 심층 분석(RL, 에이전트, 환각 등). 2026-07-04 활성.
  { url: "https://lilianweng.github.io/index.xml", source: "Lil'Log (Lilian Weng)", category: "Research", limit: 4 },
  // NVIDIA Technical Blog. 개발자·데이터사이언티스트·IT관리자용 공식 기술 블로그. 모델 추론·CUDA 최적화·NIM 마이크로서비스 등.
  // blogs.nvidia.com(기업 블로그)와 별개 채널. aiOnly 로 비-AI 게시물(양자컴퓨팅 등) 필터링. 2026-07-13 기준 100건+ 활성.
  { url: "https://developer.nvidia.com/blog/feed/", source: "NVIDIA Technical Blog", category: "Practice", aiOnly: true, limit: 6 },

  // ── 국내 기업 기술블로그 (종합 개발 피드 → aiOnly 로 AI 글만 수집) ──────
  // 실무 관점의 AI 적용 사례가 주력이라 fallback 은 Practice. 대부분 비-AI라 매 실행 0~2건 기여.
  // 네이버 D2 제거: Cloudflare 가 Vercel 데이터센터 IP 를 차단해 403 반환(UA 무관). 우아한형제들과 동일한 서버 IP 차단 패턴.
  { url: "https://tech.kakao.com/feed/", source: "카카오 기술블로그", category: "Practice", aiOnly: true, limit: 10 },
  // 우아한형제들(techblog.woowahan.com)은 Cloudflare 가 Vercel 데이터센터 IP 를 봇으로 막아 매번 403.
  // (가정용 IP 에선 봇 UA 로도 200 → UA 가 아니라 서버 IP 차단 이슈라 코드로 우회 불가) → 피드에서 제거.
  { url: "https://toss.tech/rss.xml", source: "토스 기술블로그", category: "Practice", aiOnly: true, limit: 10 },
  { url: "https://medium.com/feed/daangn", source: "당근 기술블로그", category: "Practice", aiOnly: true, limit: 10 },
  { url: "https://techblog.lycorp.co.jp/ko/feed/index.xml", source: "LINE 기술블로그", category: "Practice", aiOnly: true, limit: 15 },
];
