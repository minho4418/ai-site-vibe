@AGENTS.md

# Knewit (뉴잇) — 프로젝트 가이드

> 매일 오전 8시 자동 큐레이션되는 한국 개발자용 AI 뉴스 사이트. (구 "AI 뉴스" → Knewit / 뉴잇 리브랜딩)
> 프로덕션: https://knewittoday.com

## 기술 스택
- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind v4**
- **Supabase** (Postgres + RLS, 익명/서비스롤 두 클라이언트)
- **Groq** (`llama-3.3-70b-versatile`) — RSS 제목·요약을 한국어 카드 요약으로 다듬음
- **Vercel** 배포 + **GitHub Actions** cron (수집/브리핑 트리거)
- ⚠️ Next.js 16은 학습 데이터와 다를 수 있음 — 코드 작성 전 `node_modules/next/dist/docs/` 확인 (AGENTS.md 참조)

## 명령어
```bash
npm run dev      # http://localhost:3000
npm run build    # next build (= 타입체크 포함, CI 필수 게이트)
npm run lint     # eslint (CI 에선 비차단/정보성)
```
> 테스트 프레임워크 없음. 검증은 `npm run build`(타입체크)가 사실상의 게이트.

## 디렉터리 구조
```
src/
├── app/
│   ├── page.tsx                      # 홈(서버) → getArticles() → HomeClient
│   ├── daily/page.tsx, [date]/       # 오늘의 브리핑 / 날짜별 브리핑
│   ├── ranking/, education/          # AI 코딩툴 랭킹 / 교육(코스)
│   ├── api/cron/ingest/route.ts      # RSS 수집·dedup·요약 (Bearer CRON_SECRET)
│   ├── api/cron/cleanup/route.ts     # 30일 지난 비북마크 기사 삭제
│   ├── api/briefing/route.ts         # 브리핑 발행 (Bearer BRIEFING_TOKEN) → Threads 게시
│   ├── api/article-summary/route.ts  # 기사 본문 온디맨드 요약
│   ├── sitemap.ts, robots.ts, feed.xml/, opengraph-image.tsx
└── lib/
    ├── articles.ts / articles-client.ts  # 서버 조회(소스당 상한 capPerSource) / 클라 조회
    ├── feeds.ts                      # RSS 피드 목록 (한국 GeekNews + Google뉴스 검색 + 영어 소스)
    ├── categorize.ts                 # 키워드 기반 카테고리 분류 + AI 관련성 필터(isAiRelated)
    ├── categories.ts                 # 8개 카테고리 정의 + 색상맵
    ├── ai-summary.ts                 # Groq 한국어 요약 (enrichSummaries)
    ├── rss-extract.ts, og-image.ts   # 요약·썸네일 추출, og:image 보강
    ├── briefings.ts, briefing-types.ts, briefing-jsonld.ts
    ├── threads.ts                    # 브리핑 Threads 자동 게시
    ├── supabase-server.ts / -browser.ts   # 서비스롤·익명 서버 / 브라우저 클라이언트
    └── use-likes.ts, use-bookmarks.ts, use-device-id.ts  # 기기별 익명 UUID 기반(로그인 없음)
.github/workflows/  ingest.yml · publish-briefing.yml · ci.yml
```

## 핵심 흐름
1. **수집 (ingest)**: GitHub Actions가 매일 23:00 UTC(=KST 08시)에 `/api/cron/ingest` 호출 → 모든 피드 병렬 fetch → `aiOnly` 필터 → `title_key` 근접중복 제거(직링크를 Google뉴스보다 우선) → `onConflict:"title_key"` upsert(멱등) → Groq 요약 보강.
   - Vercel Hobby cron은 best-effort라 조용히 스킵되는 사고가 있어 **트리거를 GitHub Actions로 이전**함. 인증은 `CRON_SECRET`.
2. **브리핑 파이프라인**: 클라우드 "데일리 브리핑" 루틴이 egress 제약으로 사이트에 직접 POST 못 함 → `publish-briefing.yml`을 dispatch → Actions 러너가 `/api/briefing`(`BRIEFING_TOKEN`)로 발행 → `daily_briefings` 저장 → 홈 히어로/Threads 노출.
3. **표출**: 홈은 서버컴포넌트가 최신 80건 조회(`capPerSource`로 소스당 최대 5건), `HomeClient`가 필터/검색/다크모드 담당.

## 카테고리 (8개)
`Tools(개발툴)` `LLM(모델·LLM)` `OpenSource(오픈소스)` `Research(연구·논문)` `Practice(실무·구축)` `Infra(인프라·HW)` `Startup(창업)` `Contest(공모전)`
- 분류는 ingest 단계에서 제목/요약 키워드(`classifyCategory`)로 결정. 피드의 `category`는 폴백, `forceCategory:true`면 고정.

## 환경 변수
| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저용 Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버(cron 수집/삭제)용 |
| `CRON_SECRET` | `/api/cron/*` 인증 |
| `BRIEFING_TOKEN` | `/api/briefing` 인증 |
| `GROQ_API_KEY` | AI 요약 (없으면 RSS 요약 폴백) |
| `NEXT_PUBLIC_SITE_URL` | 도메인 (og/canonical/sitemap 공유, 기본 knewittoday.com) |
> Supabase 미설정 시 `mock-articles.ts` 목업으로 UI는 그대로 동작.

## 작업 시 주의
- **CI/브랜치 보호**: main은 PR + `build` 통과 필요(owner 우회 가능). 커밋/푸시는 사용자가 요청할 때만.
- **저작권**: 요즘IT·벤처스퀘어 등 "무단 전재 금지" 매체는 제외됨. AI 요약 프롬프트도 원문 복붙 금지·재서술 강제(`ai-summary.ts`).
- **멱등성**: ingest의 `title_key` upsert는 Vercel cron과 GitHub Actions가 동시에 돌아도 안전.
- **커스터마이징**: 피드는 `feeds.ts`, 분류 규칙은 `categorize.ts`, 카테고리는 `categories.ts`.
