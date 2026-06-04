-- =========================================================================
-- Migration 001 — 양방향 좋아요 (취소 가능)
-- 기존 schema.sql 을 이미 실행한 프로젝트에 적용. 새 프로젝트는 schema.sql
-- 한 번만 실행하면 동일한 결과가 됨 (schema.sql 도 함께 갱신됨).
-- =========================================================================

-- 1) increment_likes : row_count 비교를 boolean → integer 로 명확화
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

-- 2) decrement_likes : 좋아요 취소
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

-- 3) likes 테이블 delete 정책 + anon delete 권한
drop policy if exists "likes_drop" on public.likes;
create policy "likes_drop" on public.likes for delete using (true);

grant delete   on public.likes to anon;
grant execute  on function public.decrement_likes(uuid, text) to anon;
