-- =========================================================================
-- Migration 005 — daily_briefings.threads_post_id
-- 오늘의 브리핑을 Threads 에 자동 게시할 때, 날짜당 1회만 올리도록(멱등) 게시된
-- Threads 미디어 ID 를 기록한다. 값이 있으면 재발행(루틴 재실행) 시 재게시하지 않는다.
-- 재실행 안전(IF NOT EXISTS).
-- =========================================================================

alter table public.daily_briefings
  add column if not exists threads_post_id text;
