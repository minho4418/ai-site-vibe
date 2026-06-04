-- =========================================================================
-- AI News — Supabase 스키마
-- Supabase 대시보드 → SQL Editor → New query 에 그대로 붙여넣고 "Run" 클릭.
-- 한 번만 실행하면 됨. 재실행도 안전하도록 IF NOT EXISTS / OR REPLACE 사용.
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. articles : RSS 크론이 채워넣는 글 목록
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  url           text not null unique,
  title         text not null,
  source        text not null,
  category      text not null,
  summary       text not null default '',
  thumbnail_url text,
  published_at  timestamptz not null,
  likes_count   integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_category_idx     on public.articles (category);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. bookmarks : 기기별 익명 UUID 스코프 (로그인 없음)
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.bookmarks (
  device_id  text not null,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (device_id, article_id)
);

create index if not exists bookmarks_device_idx on public.bookmarks (device_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. likes : 같은 기기에서 두 번 카운트되는 걸 막기 위한 보조 테이블.
--           실제 카운트는 articles.likes_count 에 누적됨 (글로벌 집계).
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.likes (
  device_id  text not null,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (device_id, article_id)
);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. RPC : 좋아요 +1 (중복 방지 + 카운트 증가를 한 번에)
--    클라이언트는 supabase.rpc('increment_likes', { p_article_id, p_device_id })
--    호출 → 반환되는 새 likes_count 로 UI 갱신.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.increment_likes(p_article_id uuid, p_device_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function public.decrement_likes(p_article_id uuid, p_device_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security
--    - articles  : 누구나 read 가능. write 는 service role(크론) 만.
--    - bookmarks : 누구나 read/write 가능 (device_id 가 자체 키 역할).
--    - likes     : 누구나 read/insert 가능. delete 는 막음 (좋아요 취소 없음).
-- ──────────────────────────────────────────────────────────────────────────
alter table public.articles  enable row level security;
alter table public.bookmarks enable row level security;
alter table public.likes     enable row level security;

drop policy if exists "articles_read"   on public.articles;
drop policy if exists "bookmarks_read"  on public.bookmarks;
drop policy if exists "bookmarks_write" on public.bookmarks;
drop policy if exists "bookmarks_drop"  on public.bookmarks;
drop policy if exists "likes_read"      on public.likes;
drop policy if exists "likes_write"     on public.likes;
drop policy if exists "likes_drop"      on public.likes;

create policy "articles_read"   on public.articles   for select using (true);
create policy "bookmarks_read"  on public.bookmarks  for select using (true);
create policy "bookmarks_write" on public.bookmarks  for insert with check (true);
create policy "bookmarks_drop"  on public.bookmarks  for delete using (true);
create policy "likes_read"      on public.likes      for select using (true);
create policy "likes_write"     on public.likes      for insert with check (true);
create policy "likes_drop"      on public.likes      for delete using (true);

-- ──────────────────────────────────────────────────────────────────────────
-- 6. anon role 권한
-- ──────────────────────────────────────────────────────────────────────────
grant usage   on schema public to anon;
grant select  on public.articles  to anon;
grant select, insert, delete on public.bookmarks to anon;
grant select, insert, delete on public.likes to anon;
grant execute on function public.increment_likes(uuid, text) to anon;
grant execute on function public.decrement_likes(uuid, text) to anon;
