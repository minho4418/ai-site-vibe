-- =========================================================================
-- Migration 007 — repo_star_snapshots (주간 상승 자체 집계)
-- GitHub 이 2026-06-30 부로 /repos/{owner}/{repo}/stargazers 목록 API 를
-- 관리자·협력자 전용으로 제한해(스팸 봇의 사용자 수집 차단) 기존 주간 상승
-- 집계가 전부 403 으로 죽었다. 대신 총 별 수(stargazers_count)는 여전히
-- 공개이므로, 매일 별 수를 스냅샷하고 "오늘 − 7일 전" 차이로 직접 계산한다.
--  - 쓰기: /api/cron/star-snapshot (service role, GitHub Actions 가 매일 트리거)
--  - 읽기: getRanking() 이 anon 으로 read (daily_briefings 와 동일 정책)
--  - 보관: 35일 (주간 계산엔 7일이면 충분, 월간 확장 여지로 여유) — 쓰기 시 함께 정리
-- 재실행 안전(IF NOT EXISTS).
-- =========================================================================

create table if not exists public.repo_star_snapshots (
  repo          text not null,                     -- "owner/name" 소문자
  snapshot_date date not null,                     -- KST 기준 수집일
  stars         integer not null,
  created_at    timestamptz not null default now(),
  primary key (repo, snapshot_date)
);

-- 보관 기간 정리(delete where snapshot_date < cutoff)용.
create index if not exists repo_star_snapshots_date_idx on public.repo_star_snapshots (snapshot_date);

-- RLS: 누구나 read, write 는 service role(cron 엔드포인트)만 — daily_briefings 와 동일.
alter table public.repo_star_snapshots enable row level security;

drop policy if exists "repo_star_snapshots_read" on public.repo_star_snapshots;
create policy "repo_star_snapshots_read" on public.repo_star_snapshots for select using (true);

grant usage  on schema public to anon;
grant select on public.repo_star_snapshots to anon;
