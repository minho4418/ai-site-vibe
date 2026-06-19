# Knewit 코드베이스 진단 리포트 (AI 가독성·리팩토링·확장성)

> 작성: 2026-06-19. 범위: `src/`(app/components/lib) + 루트 설정(package.json, tsconfig, eslint, next.config, vercel.json, .github/workflows).
> 한 줄 총평: **전반적으로 매우 건강한 코드베이스.** lib 계층 분리가 깔끔하고, "왜" 주석이 풍부하며, 데이터 주도(data-driven) 배열로 확장 지점이 명확하다. 가장 큰 부채는 **자동화 테스트 0개**와 **DB 스키마가 코드와 분리되어 암묵적으로 결합**되어 있다는 점. (※ 테스트는 본 리포트와 함께 1차 도입 완료 — `npm test` 참고)

---

## 1. 아키텍처 개요

- **렌더링 패턴**: 서버 컴포넌트(`src/app/*/page.tsx`)가 데이터를 fetch해 단일 클라이언트 컴포넌트(`HomeClient`, `RankingClient`, `EducationClient`, `BriefingView`)에 props로 내려주는 일관된 "서버는 fetch, 클라는 상호작용" 구조. lib는 `import "server-only"`(예: `articles.ts`, `ai-summary.ts`, `github.ts`)와 `"use client"`(예: `articles-client.ts`, `use-likes.ts`) 경계가 명확히 갈림.
- **수집 데이터 흐름**: GitHub Actions cron(`.github/workflows/ingest.yml`) → `/api/cron/ingest` → `FEEDS` 병렬 fetch → `classifyCategory`/`isAiRelated` 재분류 → 제목 정규화 dedup → `enrichThumbnails`(og:image) → Supabase `articles` upsert(`onConflict: title_key`) → `enrichSummaries`(Groq 한국어 요약+키워드) → 홈은 `getArticles`로 read하고 `capPerSource`로 소스 쏠림 방지.
- **브리핑 파이프라인**: 클라우드 루틴 → (egress 제약 우회) GitHub Actions dispatch(`publish-briefing.yml`) → `/api/briefing`(BRIEFING_TOKEN) → `parseBriefing` 검증 → `daily_briefings` upsert → 성공 시 `postBriefingToThreads`로 Threads 체인 자동 게시(멱등 키 = root post id).
- **부가 기능**: `/ranking`(GitHub awesome-list ∩ 검색 하이브리드, ISR 1h), `/education`(정적 큐레이션 배열), likes/bookmarks/views(device_id 기반, Supabase RPC + 낙관적 업데이트).

---

## 2. AI 가독성 (AI-readability)

### 잘 되어 있는 점 (강점)
- **"왜" 주석이 모범적.** 단순 동작 설명이 아니라 의사결정 근거를 남김. 예: `articles.ts:13-16`(MAX_PER_SOURCE 이유), `feeds.ts:29-30`(요즘IT 제거 = 저작권), `ArticleCard.tsx:11-26`(BODY_BLOCKED_HOSTS 도메인별 차단 사유). AI 에이전트가 "건드리면 안 되는 이유"를 바로 파악 가능.
- **명확한 타입 경계.** `types.ts`(Article), `briefing-types.ts`(Briefing+검증), `github.ts`(RankedRepo/Ranking), `courses.ts`(Course). 카테고리는 `as const` + `(typeof CATEGORIES)[number]["id"]`로 단일 출처(`categories.ts:15`).
- **순수 함수 분리.** `time.ts`, `format-briefing-date.ts`, `rss-extract.ts`, `categorize.ts`가 부수효과 없이 테스트 가능한 형태. `briefing-types.ts`는 서버 의존 없이 검증 로직만 담아 read/write 양쪽이 공유.
- **graceful degradation 일관.** Supabase 미설정 → mock, 컬럼 미생성 → 단계적 재조회(`articles.ts:85-94`), Groq 실패 → null 폴백.

### 해치는 점 (약점)
- **`HomeClient.tsx`(349줄)가 god-component.** 헤더 마크업 + 6개 상태 + 필터/정렬/검색/북마크/키워드/hot 계산 + 인라인 SVG 5종이 한 파일에. 헤더(150-255)와 상태 로직(40-146)이 한 컴포넌트라 AI가 "정렬 로직만" 수정하려 해도 전체를 읽어야 함.
- **DB 스키마가 코드 어디에도 없음(암묵 결합).** `articles` 테이블 컬럼(`title_key`, `views_count`, `detail_summary`, `keywords`), RPC(`increment_views`, `increment_likes`, `decrement_likes`), `onConflict` 인덱스가 주석으로만 언급(`ingest/route.ts:192` "migrations/002 참고")되는데 **리포지토리에 migrations 폴더가 없음**. AI가 스키마를 추론하려면 7~8개 파일의 select/rpc 호출을 역추적해야 함 — 가장 큰 가독성/안전성 리스크.
- **`CategoryKey` 이름 충돌.** `categories.ts`의 `CategoryId`(뉴스 카테고리)와 `ai-tools.ts`의 `CategoryKey`(랭킹: skills/agents/mcp)와 `courses.ts`의 `CourseCategoryKey`(강의)가 모두 "category"를 쓰지만 다른 도메인. `ai-tools.ts`는 export까지 `CATEGORIES`로 똑같아 import 시 혼동 유발.
- **카테고리 정규화 로직 중복(drift 위험).** `articles.ts:60-62`의 `normalizeCategory`와 `articles-client.ts:29-31`이 동일 규칙을 따로 구현하고, fallback "LLM"이 양쪽에 하드코딩. 한쪽만 고치면 서버/클라 분류가 어긋남.

---

## 3. 확장성 (extensibility)

### 추가가 쉬운 곳 (데이터 주도 — 잘 설계됨)
- **`FEEDS`(`feeds.ts:26`)**: RSS 소스 추가 = 배열에 한 줄. `aiOnly`/`forceCategory`/`limit` 플래그로 동작 커스터마이즈. 죽은 피드는 `Promise.allSettled`로 자동 스킵.
- **`CATEGORIES`(`categories.ts:3`)**: 새 카테고리 추가 시 타입이 자동 전파. 단, 색상 맵 3개를 함께 채워야 함(아래 참조).
- **`COURSES`/`COURSE_CATEGORIES`(`courses.ts`)**, **`KEYWORD_DEFS`(`keywords.ts:8`)**, **`ai-tools.ts`의 `CATEGORIES`/`seeds`/`BLOCKLIST`**: 모두 "한 줄 추가" 패턴으로 주석에도 명시됨.
- **`SITE_URL` 환경변수화(`site.ts:3`)**: 도메인 변경이 코드 수정 불필요.

### 추가가 아픈 곳 (함께 바뀌어야 하는 곳)
- **새 카테고리 = 4~5곳 동시 수정.** `categories.ts`(라벨) + `CATEGORY_CHIP_ACTIVE` + `CATEGORY_COLORS` + `ArticleCard.tsx:38-47`(`CATEGORY_HUE`) + `categorize.ts`의 `RULES`. 색상 3맵이 분산되어 한 곳을 빠뜨리면 런타임에 조용히 폴백(에러 없이 잘못된 색). `CATEGORY_HUE`가 lib가 아닌 컴포넌트에 있어 응집도 저하.
- **호스트 차단 목록 분산.** `ArticleCard.tsx`의 `BODY_BLOCKED_HOSTS`(본문 차단)와 `og-image.ts`/`article-body.ts`의 `isResolvableForOg`가 별도 관리. 새 차단 도메인이 생기면 클라/서버 양쪽을 봐야 함.
- **새 페이지 = 헤더 복붙.** `HomeClient`, `RankingClient`, `EducationClient`, `DailyHeader`가 거의 동일한 sticky 헤더 + 로고 + "오늘의 AI 뉴스" 버튼 마크업을 각자 들고 있음.

---

## 4. 리팩토링 후보

| 파일 | 무엇 | 왜 | 노력 |
|---|---|---|---|
| `HomeClient`/`RankingClient`/`EducationClient`/`DailyHeader` | 공통 sticky 헤더(로고 SVG + 백버튼)를 `<SiteHeader>` 로 추출 | 동일 마크업이 4곳 복붙, 로고 SVG path가 최소 4번 반복 | M |
| `articles.ts:60` + `articles-client.ts:29` | `normalizeCategory` + Article 매핑 로직을 공유 모듈로 통합 | 서버/클라 두 구현이 drift 가능, fallback "LLM" 이중 하드코딩 | S |
| `ai-summary.ts`(전체) | `summarizeArticle`/`summarizeForCard`/`generateDetailSummary` 의 fetch+timeout+파싱 보일러플레이트를 `callGroq()` 로 추출 | 같은 Groq 호출 골격이 3번 복제 | M |
| `og-image.ts` + `ai-summary.ts`(`enrichSummaries`) | "cursor + worker pool + concurrency" 패턴을 `runPool()` 유틸로 통합 | 동시성 워커 루프 중복 구현 | S |
| `ingest/route.ts:71-235`(GET 핸들러, 165줄) | 5단계(fetch/dedup/og/upsert/summarize)를 함수로 분리 | 단일 함수가 너무 길고 책임 혼재 → 분리 시 테스트 가능 | M |
| `ingest`+`cleanup`+`briefing` route | Bearer 토큰 인증 가드를 `requireBearer(request, envName)` 헬퍼로 통일 | 동일 인증 패턴 3곳 중복 | S |
| `HomeClient.tsx` 인라인 SVG | 아이콘을 `icons.tsx` 로 추출 | JSX 가독성 저하, 아이콘 페이지 간 복붙 | S |

---

## 5. 위험 / 기술 부채

- **🔴 자동화 테스트 0개** → 본 리포트와 함께 1차 도입 시작(순수 함수 6종). 추가로 `titleKey`/`pickPublishedAt`(`ingest/route.ts`), `capPerSource`(`articles.ts`), `splitLead`(`BriefingView.tsx`)도 테스트 가치 높음(조용한 오작동 영역).
- **🔴 DB 스키마/마이그레이션 미버전관리.** `migrations/002` 주석은 있으나 실제 파일 부재. RLS·컬럼·RPC 정의가 코드에 없어 신규 환경 셋업·AI 작업이 거의 불가능.
- **🟡 lint가 비차단(informational).** `ci.yml` `continue-on-error: true` + 코드 내 `eslint-disable` 다수. 부채 누적 중.
- **🟡 타입 안전성 갭(경미).** `articles.ts:106` `data as unknown as ArticleRow[]` 등 Supabase 응답 수동 캐스팅 다수. `supabase gen types` 미사용으로 스키마 변경을 컴파일러가 못 잡음.
- **🟡 `next.config.ts` CSP에 `unsafe-inline`+`unsafe-eval`.** 사유는 주석에 명확(RSC/hydration/next-themes). 외부 RSS/LLM 생성물을 `dangerouslySetInnerHTML` 하는 곳(JSON-LD)은 검증된 값이라 현재는 안전.
- **🟡 성능: `getArticles`가 `force-dynamic` + 최대 4회 순차 재조회.** 컬럼 정상 환경에선 1회로 끝나지만 미생성 시 매 요청 4회 왕복. 스키마 안정화 시 폴백 제거 가능.
- **🟢 보안은 양호.** service role 키는 server-only 모듈에만, anon 키만 클라 노출. cron/briefing Bearer 인증. `parseBriefing` 이 `javascript:` 스킴·유니코드 손상 차단. CSP/HSTS 등 헤더 baseline 충실.

---

## 6. 우선순위 권고 (Top 7)

1. **DB 스키마를 리포에 버전관리(`supabase/migrations/`)** — 운영 중인 테이블·인덱스(`title_key` UNIQUE)·RPC를 SQL로 커밋. 암묵 결합 제거 + AI/신규 환경이 스키마 인지. 효과 大 / 난이도 中.
2. **순수 함수 단위 테스트 + CI 연동** — ✅ 1차 착수(`npm test`). 남은 후보(`capPerSource`, `titleKey`, `splitLead`) 확대. 효과 大 / 난이도 中.
3. **Supabase 타입 자동생성** — `supabase gen types typescript` → `as unknown as` 제거. 스키마-코드 동기화를 컴파일러가 강제. 효과 中~大 / 난이도 中(1번 후 자연스럽게).
4. **공통 `<SiteHeader>` 추출 + 아이콘 모듈화** — 4곳 중복 헤더/SVG 통합. 신규 페이지 비용↓. 효과 中 / 난이도 中.
5. **카테고리 정의/색상 단일화 + `normalizeCategory` 공유** — `CATEGORY_HUE`를 `categories.ts`로 이동, 서버/클라 정규화 공유. drift·누락 방지. 효과 中 / 난이도 小.
6. **Groq 호출 + 동시성 워커 헬퍼 추출** — `callGroq()`/`runPool()`. LLM 정책 변경이 1곳에서. 효과 中 / 난이도 小~中.
7. **lint를 차단 게이트로 승격** — 잔여 에러 정리 후 `continue-on-error` 제거. 효과 中 / 난이도 小(에러 양에 따라).

---

### 마무리
이 코드베이스는 "AI가 읽기 쉽게"라는 목표를 **주석 문화와 모듈 분리 측면에서 이미 상당히 달성**했다. 남은 핵심은 (a) **DB 스키마를 코드와 같은 곳에 두어 암묵 지식을 명시화**하고, (b) **테스트로 순수 로직을 고정**하는 것. 이 둘만 해결하면 안전한 리팩토링·확장의 토대가 완성된다.
