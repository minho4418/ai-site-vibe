# Knewit 뉴잇 🤖

> 개발자를 위한 AI 뉴스 큐레이션 서비스

AI·개발툴·실무·창업·공모전까지, 유용한 AI 소식을 RSS로 모아 **매시간 자동 큐레이션**합니다.

**기술 스택** — Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase · Vercel Cron

---

## ✨ 주요 기능
[CLAUDE.md](../../../Downloads/CLAUDE.md)
- **6개 카테고리 자동 분류** — 개발툴 / 모델·LLM / 실무·구축 / 커리어 / 창업 / 공모전
  제목·요약 키워드로 카테고리를 자동 판별 (`src/lib/categorize.ts`)
- **한국 + 영어 소스 균형 수집**
  - 🇰🇷 GeekNews · 요즘IT · 벤처스퀘어 · Google뉴스(코딩툴/모델/실무/채용/창업/공모전 검색)
  - 🇺🇸 OpenAI · Anthropic · TechCrunch · The Verge · Hacker News
  - 종합 피드(GeekNews 등)는 **AI 관련 글만 필터링**해서 수집
- **좋아요 · 북마크** — 기기별 익명 UU[CLAUDE.md](../../../Downloads/CLAUDE.md)ID 기준 (로그인 없음)
- **검색 · 카테고리 필터 · 다크모드**
- **디자인** — Figma Config 무드 (크림 베이스 + 그라데이션 히어로 + 그레인 + 비비드 칩, `Black Han Sans` 디스플레이 폰트)
- **썸네일 폴백** — 이미지가 없거나 깨지면 카테고리 색 그라데이션 대체 이미지 표시
- **목업 데이터 폴백** — Supabase 미설정 상태에서도 UI가 동작하도록 샘플 데이터 제공
- **자동 정리** — 매일 30일 지난 **비북마크** 기사를 삭제 (북마크한 글은 보존)

---

## 🚀 로컬 개발

```bash
npm install
cp .env.example .env.local   # Supabase 키 + CRON_SECRET 입력
npm run dev                  # http://localhost:3000
```

### RSS 수집(cron) 수동 실행

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest
```

> 응답 JSON에서 피드별 `fetched`(수집 수)·`upserted`(저장 수)를 확인할 수 있습니다.

---

## 🔑 환경 변수 (`.env.local`)

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public 키 (브라우저용) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role 키 (cron 수집 시 서버에서만 사용) |
| `CRON_SECRET` | `/api/cron/ingest` 호출 인증용 시크릿 |

---

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── api/cron/ingest/route.ts   # RSS 수집 (Bearer CRON_SECRET 인증)
│   ├── api/cron/cleanup/route.ts  # 30일 지난 비북마크 기사 삭제
│   ├── layout.tsx                 # 폰트 · ThemeProvider · 크림 베이스
│   ├── globals.css                # Tailwind · 폰트 변수 · 그레인 텍스처
│   └── page.tsx                   # 서버 컴포넌트 → getArticles()
├── components/
│   ├── HomeClient.tsx             # 히어로 · 필터 · 검색 · 상태 관리(클라이언트)
│   ├── ArticleCard.tsx            # 기사 카드 + 썸네일 폴백
│   ├── CategoryFilter.tsx         # 비비드 카테고리 칩
│   ├── SearchInput.tsx
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
└── lib/
    ├── articles.ts                # 서버 조회 + 목업 폴백
    ├── categories.ts              # 카테고리 정의 · 색상 · 라벨
    ├── categorize.ts              # 키워드 기반 카테고리 자동 분류 + AI 관련성 필터
    ├── feeds.ts                   # RSS 피드 목록 (한국/영어 소스)
    ├── mock-articles.ts           # Supabase 미설정 시 샘플 데이터
    ├── rss-extract.ts             # 요약 · 썸네일 · URL 정규화
    ├── supabase-browser.ts        # 브라우저 클라이언트
    ├── supabase-server.ts         # 서버 클라이언트
    ├── time.ts                    # 상대 시간(한국어)
    ├── types.ts
    ├── use-device-id.ts           # 기기별 익명 UUID
    ├── use-likes.ts               # 좋아요 (RPC, 기기당 1회)
    └── use-bookmarks.ts           # 북마크 (device_id 스코프, Supabase 연동)

supabase/
├── schema.sql                     # 최초 1회 Supabase SQL Editor 에서 실행
└── migrations/                    # 추가 마이그레이션

vercel.json                        # Cron: 매일 08시(KST) ingest + 08시30분 cleanup
```

---

## 🗄️ Supabase 설정

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. **SQL Editor** 에서 `supabase/schema.sql` 실행 (테이블 · RLS 정책 생성)
3. **Settings → API** 에서 URL · anon key · service role key 복사 → `.env.local` 에 입력

> Supabase를 설정하지 않아도 목업 데이터로 UI는 그대로 동작합니다.

---

## 🏷️ 카테고리 / 피드 커스터마이징

- **피드 추가·삭제** — `src/lib/feeds.ts` 의 `FEEDS` 배열 수정.
  종합 피드는 `aiOnly: true` 로 AI 관련 글만 거를 수 있고, 죽은 URL은 해당 피드만 스킵됩니다.
- **분류 규칙 수정** — `src/lib/categorize.ts` 의 `RULES` (우선순위 순)와 `AI_SIGNAL` 정규식 조정.
- **카테고리 추가** — `src/lib/categories.ts` 의 `CATEGORIES` · 색상 맵에 항목 추가.

---

## ☁️ 배포 (Vercel)

1. GitHub 에 푸시
2. Vercel 에서 저장소 Import
3. **Settings → Environment Variables** 에 위 환경 변수 4개 등록
4. Redeploy → Vercel Cron 이 매시간 `/api/cron/ingest` 를 호출하며 자동 수집 시작
