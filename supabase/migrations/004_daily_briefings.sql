-- =========================================================================
-- Migration 004 — 오늘의 브리핑(daily_briefings)
-- 클라우드 "데일리 브리핑" 루틴이 매일 리서치 → /api/briefing 으로 POST → 서비스키로 upsert.
-- 사이트는 anon 키로 read. payload(jsonb) 에 브리핑 객체 전체, date 는 정렬·조회 키(PK).
-- 재실행 안전(IF NOT EXISTS / ON CONFLICT).
-- =========================================================================

create table if not exists public.daily_briefings (
  date        date primary key,                 -- "YYYY-MM-DD" (KST 기준 발행일)
  payload     jsonb not null,                   -- Briefing 객체 전체 {title,summary,sections,pick,...}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists daily_briefings_date_idx on public.daily_briefings (date desc);

-- RLS: 누구나 read, write 는 service role(발행 엔드포인트)만 — articles 와 동일 정책.
alter table public.daily_briefings enable row level security;

drop policy if exists "daily_briefings_read" on public.daily_briefings;
create policy "daily_briefings_read" on public.daily_briefings for select using (true);

grant usage  on schema public to anon;
grant select on public.daily_briefings to anon;

-- 시드: 첫 정식 브리핑이 올라오기 전 화면이 비지 않도록 예시 1건(sample=true).
-- url 은 실재하는 1차 출처만. 같은 날짜가 이미 있으면 건드리지 않는다.
insert into public.daily_briefings (date, payload)
values (
  '2026-06-16',
  '{
    "date": "2026-06-16",
    "title": "오늘의 브리핑이 시작됩니다",
    "summary": "매일 오전 8시, 그날의 AI·개발 소식을 한눈에 읽도록 자동으로 정리해 드립니다. 이 글은 형식을 보여주는 예시이며, 내일부터 실제 브리핑이 올라옵니다.",
    "sections": [
      {
        "heading": "이 브리핑은 이렇게 구성됩니다",
        "items": [
          { "text": "주목할 AI 툴·제품 — 새로 나왔거나 화제인 서비스와, 개발자가 실무에 써먹는 포인트" },
          { "text": "개발자 실무 팁 — 코딩·생산성·AI 도구 활용을 오늘 바로 적용하는 법" },
          { "text": "AI 업계 뉴스 — 새 모델 출시·주요 발표·의미 있는 트렌드의 핵심" },
          { "text": "개발자 업계 뉴스 — 프레임워크·언어·플랫폼 업데이트와 오픈소스 동향" }
        ]
      },
      {
        "heading": "그동안 살펴보면 좋은 1차 출처",
        "items": [
          { "text": "Anthropic 뉴스룸 — Claude 모델·Claude Code·기능 업데이트가 올라오는 공식 채널", "url": "https://www.anthropic.com/news", "source": "Anthropic" },
          { "text": "OpenAI 뉴스 — 새 모델과 제품 발표", "url": "https://openai.com/news", "source": "OpenAI" },
          { "text": "Google AI 블로그 — 연구와 제품 양쪽의 AI 소식", "url": "https://blog.google/technology/ai/", "source": "Google" }
        ]
      }
    ],
    "pick": { "text": "먼저 홈의 최신 뉴스와 AI 랭킹을 둘러보세요. 내일 아침 첫 정식 브리핑으로 다시 찾아옵니다.", "url": "/ranking" },
    "sample": true
  }'::jsonb
)
on conflict (date) do nothing;
