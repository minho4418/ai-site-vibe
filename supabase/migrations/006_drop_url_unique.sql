-- =========================================================================
-- Migration 006 — 옛 url UNIQUE 제약 제거
--
-- 배경: migration 002 에서 누적 중복 기준을 url → title_key 로 옮기고
--   크론 upsert 의 onConflict 도 title_key 로 바꿨다. 그러나 최초 스키마
--   (schema.sql: `url text not null unique`)가 만든 url UNIQUE 제약
--   articles_url_key 를 지우지 않아, 두 개의 UNIQUE 가 공존했다.
--
-- 증상: ingest 가 가져온 기사 중 "url 은 이미 DB 에 있고 title_key 는 다른"
--   행이 하나라도 있으면, onConflict:"title_key" upsert 는 그 행을 INSERT 로
--   시도하다 articles_url_key 위반 → 단일 문장 batch 전체 롤백
--   → total_upserted=0, results 에
--     "duplicate key value violates unique constraint \"articles_url_key\"".
--
-- 조치: dedup 의 단일 키는 이제 title_key 다. 남은 url UNIQUE 제약을 제거한다.
--   (url 자체는 계속 컬럼으로 저장되며, not null 도 유지된다. 유일성만 해제.)
--   재실행해도 안전(IF EXISTS / 멱등).
-- =========================================================================

alter table public.articles drop constraint if exists articles_url_key;
