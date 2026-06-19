-- 0001_init.sql — Knewit 초기 스키마 베이스라인
--
-- 운영 중인 Supabase(Postgres) DB 에서 역추출해 복원한 단일 베이스라인 마이그레이션이다.
-- 그동안 스키마가 코드 어디에도 없어 암묵적으로만 존재했는데(신규 환경 셋업·AI 작업이 막힘),
-- 이 파일로 "재현 가능한 진실의 원천"을 만든다.
--
-- 적용 방법:
--   - Supabase CLI: `supabase db push` (권장)
--   - 또는 대시보드 SQL Editor 에 이 파일 전체를 붙여 실행
-- 모든 객체는 idempotent(IF NOT EXISTS / OR REPLACE / DROP-then-CREATE)하게 작성돼 재실행해도 안전하다.
--
-- 권한 모델 요약:
--   - 브라우저(anon)는 RLS 로 읽기 + (likes/bookmarks) 토글만 가능. articles/daily_briefings 쓰기는 불가.
--   - 수집(ingest)·브리핑 발행은 service_role 키로 동작(RLS 우회)하므로 별도 쓰기 정책이 없다.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ─────────────────────────────────────────────────────────────
-- articles : 수집된 기사. 누적 중복은 title_key UNIQUE 인덱스로 차단.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.articles (
  id             uuid primary key default gen_random_uuid(),
  url            text not null,
  title          text not null,
  source         text not null,
  category       text not null,
  summary        text not null default '',
  thumbnail_url  text,
  published_at   timestamptz not null,
  likes_count    integer not null default 0,
  created_at     timestamptz not null default now(),
  views_count    integer not null default 0,
  ai_summary     text,
  detail_summary jsonb,
  title_key      text,
  keywords       text[]
);

-- 근접중복 식별자: 같은 제목키는 DB 전체에서 1건만. ingest 의 `on conflict (title_key)` upsert 대상.
-- (UNIQUE 제약이 아니라 UNIQUE 인덱스로 존재 — ON CONFLICT 는 둘 다 동작.)
create unique index if not exists articles_title_key_key on public.articles (title_key);
create index if not exists articles_category_idx on public.articles (category);
create index if not exists articles_published_at_idx on public.articles (published_at desc);

-- ─────────────────────────────────────────────────────────────
-- likes / bookmarks : 기기별 익명(device_id) 토글. 기사 삭제 시 함께 정리(FK CASCADE).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.likes (
  device_id  text not null,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (device_id, article_id)
);

create table if not exists public.bookmarks (
  device_id  text not null,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (device_id, article_id)
);
create index if not exists bookmarks_device_idx on public.bookmarks (device_id);

-- ─────────────────────────────────────────────────────────────
-- daily_briefings : 날짜당 1건의 "오늘의 브리핑". payload(jsonb) 에 Briefing 전체가 들어감.
-- threads_post_id 가 채워지면 그 날짜는 이미 Threads 게시됨(멱등 키).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.daily_briefings (
  date            date primary key,
  payload         jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  threads_post_id text
);
create index if not exists daily_briefings_date_idx on public.daily_briefings (date desc);

-- ─────────────────────────────────────────────────────────────
-- RPC 함수 (모두 SECURITY DEFINER + search_path=public).
-- anon 이 좋아요/조회수 카운터만 안전하게 조작하도록 캡슐화한다(테이블 직접 UPDATE 권한은 없음).
-- ─────────────────────────────────────────────────────────────

-- 좋아요 +1 : likes 에 (기기,기사)를 insert 해 성공했을 때만 articles.likes_count 를 올린다(기기당 1회 보장).
create or replace function public.increment_likes(p_article_id uuid, p_device_id text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_inserted integer;
  v_count    integer;
begin
  insert into public.likes (device_id, article_id)
  values (p_device_id, p_article_id)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.articles
       set likes_count = likes_count + 1
     where id = p_article_id
    returning likes_count into v_count;
  else
    select likes_count into v_count
      from public.articles
     where id = p_article_id;
  end if;

  return v_count;
end;
$function$;

-- 좋아요 -1 : likes 에서 delete 에 성공했을 때만 차감(0 미만 방지).
create or replace function public.decrement_likes(p_article_id uuid, p_device_id text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_deleted integer;
  v_count   integer;
begin
  delete from public.likes
   where device_id = p_device_id
     and article_id = p_article_id;

  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    update public.articles
       set likes_count = greatest(0, likes_count - 1)
     where id = p_article_id
    returning likes_count into v_count;
  else
    select likes_count into v_count
      from public.articles
     where id = p_article_id;
  end if;

  return v_count;
end;
$function$;

-- 조회수 +1 : 클라이언트가 문자열 id 를 넘기므로 id::text 로 비교한다.
create or replace function public.increment_views(p_article_id text)
returns integer
language sql
security definer
set search_path to 'public'
as $function$
  update articles set views_count = views_count + 1
  where id::text = p_article_id
  returning views_count;
$function$;

-- anon/authenticated 가 RPC 를 호출할 수 있도록 EXECUTE 부여(SECURITY DEFINER 라 내부 권한은 함수 소유자 기준).
grant execute on function public.increment_likes(uuid, text) to anon, authenticated;
grant execute on function public.decrement_likes(uuid, text) to anon, authenticated;
grant execute on function public.increment_views(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS : 4개 테이블 모두 활성화. 정책은 role `public`(anon+authenticated) 기준.
-- ─────────────────────────────────────────────────────────────
alter table public.articles        enable row level security;
alter table public.likes           enable row level security;
alter table public.bookmarks       enable row level security;
alter table public.daily_briefings enable row level security;

-- articles : 읽기만 공개(쓰기는 service_role 전용 = ingest).
drop policy if exists articles_read on public.articles;
create policy articles_read on public.articles for select to public using (true);

-- daily_briefings : 읽기만 공개(발행은 service_role 전용).
drop policy if exists daily_briefings_read on public.daily_briefings;
create policy daily_briefings_read on public.daily_briefings for select to public using (true);

-- likes : 읽기 + 추가 + 삭제(토글). UPDATE 없음. (앱은 보통 RPC 를 쓰지만 직접 토글도 허용된 상태.)
drop policy if exists likes_read  on public.likes;
drop policy if exists likes_write on public.likes;
drop policy if exists likes_drop  on public.likes;
create policy likes_read  on public.likes for select to public using (true);
create policy likes_write on public.likes for insert to public with check (true);
create policy likes_drop  on public.likes for delete to public using (true);

-- bookmarks : 읽기 + 추가 + 삭제(토글). UPDATE 없음.
drop policy if exists bookmarks_read  on public.bookmarks;
drop policy if exists bookmarks_write on public.bookmarks;
drop policy if exists bookmarks_drop  on public.bookmarks;
create policy bookmarks_read  on public.bookmarks for select to public using (true);
create policy bookmarks_write on public.bookmarks for insert to public with check (true);
create policy bookmarks_drop  on public.bookmarks for delete to public using (true);
